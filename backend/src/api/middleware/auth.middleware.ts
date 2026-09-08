import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "./tenant.middleware.js";

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.userId) {
    return res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication is required. Provide a valid Bearer token."
      }
    });
  }
  next();
}

export function requireRole(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // If platform super admin, allow full bypass
    if (req.tenantContext?.isPlatformAdmin) {
      return next();
    }

    const currentRole = req.userRole || req.tenantContext?.roles?.[0];
    if (!currentRole || !allowedRoles.includes(currentRole)) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN_INSUFFICIENT_ROLE",
          message: `Access denied. Requires one of roles: [${allowedRoles.join(", ")}], but current role is '${currentRole || 'none'}'`
        }
      });
    }
    next();
  };
}

export function requirePermission(permissionCode: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (req.tenantContext?.isPlatformAdmin) {
      return next();
    }

    const permissions = req.tenantContext?.permissions || [];
    if (!permissions.includes("*") && !permissions.includes(permissionCode)) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN_INSUFFICIENT_PERMISSION",
          message: `Access denied. Requires permission: '${permissionCode}'`
        }
      });
    }
    next();
  };
}
