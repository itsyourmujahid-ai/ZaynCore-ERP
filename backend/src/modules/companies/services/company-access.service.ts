// ============================================================================
// Multi-Company Access Control & Authorization Service (Phase 14)
// ============================================================================

import { db } from '@/database/storage';
import { DbCompany, DbCompanyAccess, CompanyAccessLevel } from '@/database/types';
import { TenantContext } from '@/core/types/common';
import { ValidationError, NotFoundError, TenantViolationError } from '@/core/errors/DomainErrors';

export interface GrantCompanyAccessDTO {
  userId: string;
  companyId: string;
  accessLevel: CompanyAccessLevel;
  isDefault?: boolean;
}

export class CompanyAccessService {
  public getUserAccessibleCompanies(userId: string, ctx: TenantContext): DbCompany[] {
    const allCompanies = db.getCompanies();

    // Platform Admins have access to all companies
    if (ctx.isPlatformAdmin) {
      return allCompanies;
    }

    const explicitAccesses = db.getCompanyAccesses(userId);
    if (explicitAccesses.length === 0) {
      // Fallback to active tenant company
      return allCompanies.filter((c) => c.id === ctx.companyId);
    }

    const companyIdSet = new Set(explicitAccesses.map((a) => a.companyId));
    companyIdSet.add(ctx.companyId);

    return allCompanies.filter((c) => companyIdSet.has(c.id));
  }

  public hasAccessToCompany(userId: string, targetCompanyId: string, requiredLevel: CompanyAccessLevel = 'view_only', ctx: TenantContext): boolean {
    if (ctx.isPlatformAdmin) return true;
    if (targetCompanyId === ctx.companyId) return true;

    const accessList = db.getCompanyAccesses(userId);
    const access = accessList.find((a) => a.companyId === targetCompanyId);
    if (!access) return false;

    if (requiredLevel === 'view_only') return true;
    if (requiredLevel === 'full' && (access.accessLevel === 'full' || access.accessLevel === 'admin')) return true;
    if (requiredLevel === 'admin' && access.accessLevel === 'admin') return true;

    return false;
  }

  public assertCompanyAccess(userId: string, targetCompanyId: string, requiredLevel: CompanyAccessLevel = 'view_only', ctx: TenantContext): void {
    if (!this.hasAccessToCompany(userId, targetCompanyId, requiredLevel, ctx)) {
      throw new TenantViolationError(`User does not have required '${requiredLevel}' access to company '${targetCompanyId}'.`);
    }
  }

  public grantCompanyAccess(dto: GrantCompanyAccessDTO, ctx: TenantContext): DbCompanyAccess {
    if (!dto.userId || !dto.companyId || !dto.accessLevel) {
      throw new ValidationError('User ID, Company ID, and Access Level are required.');
    }

    const company = db.getCompanyById(dto.companyId, ctx);
    if (!company) throw new NotFoundError('Company', dto.companyId);

    const existing = db.getCompanyAccesses(dto.userId).find((a) => a.companyId === dto.companyId);
    if (existing) {
      return db.updateCompanyAccess(existing.id, {
        accessLevel: dto.accessLevel,
        isDefault: dto.isDefault ?? existing.isDefault,
      }, ctx);
    }

    return db.createCompanyAccess({
      userId: dto.userId,
      companyId: dto.companyId,
      accessLevel: dto.accessLevel,
      isDefault: dto.isDefault ?? false,
    }, ctx);
  }
}

export const companyAccessService = new CompanyAccessService();
