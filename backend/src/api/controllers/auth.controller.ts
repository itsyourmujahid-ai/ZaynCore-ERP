import type { Request, Response, NextFunction } from "express";
import { db } from "../../database/storage.js";
import { signToken } from "../auth/jwt.js";

export const authController = {
  login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, companyId } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Email is required" } });
      }

      const users = db.getUsers();
      const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (!user) {
        return res.status(401).json({ success: false, error: { code: "INVALID_CREDENTIALS", message: "Invalid email or credentials" } });
      }

      const memberships = db.getMemberships(user.id);
      const activeMembership = companyId 
        ? memberships.find((m) => m.companyId === companyId) 
        : memberships[0];

      if (companyId && !activeMembership && !user.isPlatformSuperAdmin) {
        return res.status(403).json({ success: false, error: { code: "NO_COMPANY_ACCESS", message: "User does not have access to the specified company" } });
      }

      const token = signToken({
        userId: user.id,
        email: user.email,
        isPlatformAdmin: user.isPlatformSuperAdmin,
        companyId: activeMembership?.companyId
      });

      return res.json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            companyId: activeMembership?.companyId,
            roleId: activeMembership?.roleId
          },
          memberships
        }
      });
    } catch (err) {
      next(err);
    }
  },

  me(req: any, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        return res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } });
      }
      const users = db.getUsers();
      const user = users.find((u) => u.id === req.userId);
      if (!user) {
        return res.status(404).json({ success: false, error: { code: "USER_NOT_FOUND", message: "User not found" } });
      }
      const memberships = db.getMemberships(user.id);
      return res.json({
        success: true,
        data: {
          user,
          memberships,
          activeCompanyId: req.companyId,
          activeRole: req.userRole
        }
      });
    } catch (err) {
      next(err);
    }
  }
};
