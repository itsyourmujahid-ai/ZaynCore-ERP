import type { Request, Response, NextFunction } from "express";
import { db } from "../../database/storage.js";
import { buildTenantContext } from "../middleware/tenant.middleware.js";

export const companiesController = {
  getCompanies(req: any, res: Response, next: NextFunction) {
    try {
      const companies = db.getCompanies();
      const isPlatformAdmin = req.tenantContext?.isPlatformAdmin;
      const userId = req.userId || req.tenantContext?.userId;

      if (isPlatformAdmin || !userId) {
        return res.json({ success: true, data: companies });
      }

      const memberships = db.getMembershipsForUser(userId);
      const allowedCompanyIds = new Set(memberships.map((m) => m.companyId));
      const filtered = companies.filter((c) => allowedCompanyIds.has(c.id));

      res.json({ success: true, data: filtered });
    } catch (err) {
      next(err);
    }
  },

  getCompany(req: any, res: Response, next: NextFunction) {
    try {
      const targetCompanyId = req.params.id;
      const isPlatformAdmin = req.tenantContext?.isPlatformAdmin;
      const userId = req.userId || req.tenantContext?.userId;

      if (userId && !isPlatformAdmin) {
        const memberships = db.getMembershipsForUser(userId);
        const hasAccess = memberships.some((m) => m.companyId === targetCompanyId);
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            error: {
              code: "FORBIDDEN_CROSS_COMPANY_ACCESS",
              message: "Access denied. User does not belong to this company."
            }
          });
        }
      }

      const company = db.getCompanies().find((c) => c.id === targetCompanyId);
      if (!company) {
        return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Company not found" } });
      }
      res.json({ success: true, data: company });
    } catch (err) {
      next(err);
    }
  },

  createCompany(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = buildTenantContext(req as any);
      const company = db.createCompany(req.body, ctx.userId, ctx);
      res.json({ success: true, data: company });
    } catch (err) {
      next(err);
    }
  }
};
