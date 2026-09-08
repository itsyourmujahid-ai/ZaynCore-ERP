import type { Request, Response, NextFunction } from "express";
import { db } from "../../database/storage.js";
import type { TenantContext } from "@/core/types/common";
import { verifyToken } from "../auth/jwt.js";

export interface AuthenticatedRequest extends Request {
  companyId?: string;
  userId?: string;
  userRole?: string;
  isTenantAuthorized?: boolean;
  tenantContext?: TenantContext;
}

export function buildTenantContext(req: AuthenticatedRequest): TenantContext {
  const companyId = (req.companyId || req.headers["x-company-id"] || "c1000000-0000-0000-0000-000000000001") as string;
  const companies = db.getCompanies();
  const company = companies.find((c) => c.id === companyId);
  const userId = (req.userId || "u1000000-0000-0000-0000-000000000001") as string;
  const dbUser = db.getUserById(userId);
  const isPlatformAdmin = dbUser?.isPlatformSuperAdmin ?? false;

  // Resolve role strictly from database memberships (NEVER trust client x-user-role)
  const memberships = db.getMembershipsForUser(userId);
  const activeMembership = memberships.find((m) => m.companyId === companyId);
  const userRole = isPlatformAdmin 
    ? "SYSTEM_ADMIN" 
    : (activeMembership?.roleId || "COMPANY_VIEWER");

  const dbRole = db.getRoleById(userRole);
  const permissions = isPlatformAdmin ? ["*"] : (dbRole?.permissions || ["*"]);

  return {
    companyId,
    companyName: company?.name || "Enterprise Company",
    companyTier: (company?.tier || "enterprise") as any,
    baseCurrency: company?.baseCurrency || "USD",
    userId,
    userEmail: dbUser?.email || "user@enterprise.com",
    userFullName: dbUser?.fullName || "Enterprise User",
    roles: [userRole],
    permissions,
    isPlatformAdmin
  };
}

export function tenantContextMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  let authenticatedUserId: string | undefined;
  let isPlatformAdmin = false;

  // 1. Check Cryptographic JWT Bearer Token
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    if (payload) {
      authenticatedUserId = payload.userId;
      isPlatformAdmin = !!payload.isPlatformAdmin;
    }
  }

  // 2. Dev / Test fallback for test harnesses (verifying user exists in DB)
  if (!authenticatedUserId && (process.env.NODE_ENV === "test" || process.env.NODE_ENV === "development")) {
    const headerUserId = req.headers["x-user-id"] as string;
    if (headerUserId) {
      const dbUser = db.getUserById(headerUserId);
      if (dbUser) {
        authenticatedUserId = dbUser.id;
        isPlatformAdmin = dbUser.isPlatformSuperAdmin;
      }
    }
  }

  if (authenticatedUserId) {
    req.userId = authenticatedUserId;
    const dbUser = db.getUserById(authenticatedUserId);
    if (dbUser) {
      isPlatformAdmin = dbUser.isPlatformSuperAdmin;
    }

    // 3. Resolve Target Company
    const requestedCompanyId = (req.headers["x-company-id"] as string) || "c1000000-0000-0000-0000-000000000001";
    req.companyId = requestedCompanyId;

    // 4. Resolve Memberships and Enforce Tenant Authorization
    const memberships = db.getMembershipsForUser(authenticatedUserId);
    const activeMembership = memberships.find((m) => m.companyId === requestedCompanyId);

    if (isPlatformAdmin || activeMembership || memberships.length === 0) {
      req.isTenantAuthorized = true;
    } else {
      // User is authenticated but does not belong to the requested company
      req.isTenantAuthorized = false;
    }

    // 5. Role and Permissions from Database (never trusted from frontend)
    const userRole = isPlatformAdmin 
      ? "SYSTEM_ADMIN" 
      : (activeMembership?.roleId || "COMPANY_VIEWER");
    req.userRole = userRole;

    req.tenantContext = buildTenantContext(req);
  } else {
    // Unauthenticated or public route
    const requestedCompanyId = req.headers["x-company-id"] as string;
    if (requestedCompanyId) {
      req.companyId = requestedCompanyId;
    }
    req.isTenantAuthorized = true; // Handled by requireAuth / requireTenant
    req.tenantContext = buildTenantContext(req);
  }

  next();
}

export function requireTenant(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.companyId && !req.headers["x-company-id"]) {
    return res.status(400).json({
      success: false,
      error: {
        code: "MISSING_TENANT_HEADER",
        message: "Header 'x-company-id' is required for tenant-scoped operations"
      }
    });
  }

  // Cross-Company Attack Prevention Guard
  if (req.userId && req.isTenantAuthorized === false) {
    return res.status(403).json({
      success: false,
      error: {
        code: "FORBIDDEN_CROSS_COMPANY_ACCESS",
        message: "Access denied. You do not have permissions or membership in this company."
      }
    });
  }

  // Tenant Status / Operational Freeze Guard
  const companyId = req.companyId || (req.headers["x-company-id"] as string);
  const company = db.getCompanies().find((c) => c.id === companyId);
  if (company && (company.status === "suspended" || company.status === "archived")) {
    const isMutation = ["POST", "PUT", "DELETE", "PATCH"].includes(req.method.toUpperCase());
    if (isMutation) {
      return res.status(403).json({
        success: false,
        error: {
          code: "TENANT_FROZEN",
          message: `Company '${company.name}' is currently ${company.status}. All database modifications are locked.`
        }
      });
    }
  }

  next();
}
