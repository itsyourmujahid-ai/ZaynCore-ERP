// ============================================================================
// Group Chart of Accounts & Local Mapping Service (Phase 14)
// ============================================================================

import { db } from '@/database/storage';
import { 
  DbGroupChartOfAccounts, 
  DbGroupAccountMapping 
} from '@/database/types';
import { TenantContext, AccountType } from '@/core/types/common';
import { ValidationError, NotFoundError } from '@/core/errors/DomainErrors';

export interface CreateGroupAccountDTO {
  groupId: string;
  code: string;
  name: string;
  classification: AccountType;
  parentGroupAccountId?: string;
  level?: number;
  description?: string;
}

export interface CreateGroupAccountMappingDTO {
  groupId: string;
  companyId: string;
  localAccountId: string;
  groupAccountId: string;
  effectiveDate?: string;
}

export class GroupCoaService {
  public getGroupAccounts(groupId?: string): DbGroupChartOfAccounts[] {
    return db.getGroupChartOfAccounts(groupId);
  }

  public createGroupAccount(dto: CreateGroupAccountDTO, ctx: TenantContext): DbGroupChartOfAccounts {
    if (!dto.groupId || !dto.code || !dto.name || !dto.classification) {
      throw new ValidationError('Group ID, account code, name, and classification are required.');
    }

    const existing = db.getGroupChartOfAccounts(dto.groupId).find(
      (a) => a.code.toUpperCase() === dto.code.toUpperCase()
    );
    if (existing) {
      throw new ValidationError(`Group account code '${dto.code}' already exists in group.`);
    }

    return db.createGroupAccount({
      groupId: dto.groupId,
      code: dto.code.toUpperCase(),
      name: dto.name,
      classification: dto.classification,
      parentGroupAccountId: dto.parentGroupAccountId,
      level: dto.level || 1,
      isActive: true,
      description: dto.description,
    }, ctx);
  }

  public getMappings(groupId?: string, companyId?: string): DbGroupAccountMapping[] {
    return db.getGroupAccountMappings(groupId, companyId);
  }

  public createMapping(dto: CreateGroupAccountMappingDTO, ctx: TenantContext): DbGroupAccountMapping {
    if (!dto.groupId || !dto.companyId || !dto.localAccountId || !dto.groupAccountId) {
      throw new ValidationError('Group, Company, Local Account, and Group Account are required for mapping.');
    }

    const groupAccounts = db.getGroupChartOfAccounts(dto.groupId);
    const targetGroupAcc = groupAccounts.find((a) => a.id === dto.groupAccountId);
    if (!targetGroupAcc) {
      throw new NotFoundError('GroupAccount', dto.groupAccountId);
    }

    const existing = db.getGroupAccountMappings(dto.groupId, dto.companyId).find(
      (m) => m.localAccountId === dto.localAccountId
    );
    if (existing) {
      return db.updateGroupAccountMapping(existing.id, {
        groupAccountId: dto.groupAccountId,
        effectiveDate: dto.effectiveDate || existing.effectiveDate,
      }, ctx);
    }

    return db.createGroupAccountMapping({
      groupId: dto.groupId,
      companyId: dto.companyId,
      localAccountId: dto.localAccountId,
      groupAccountId: dto.groupAccountId,
      effectiveDate: dto.effectiveDate || new Date().toISOString().split('T')[0],
      status: 'active',
    }, ctx);
  }

  /**
   * Resolves standard group account for a local company account.
   * If an explicit mapping exists, returns mapped group account.
   * Otherwise falls back to classification matching.
   */
  public resolveGroupAccount(groupId: string, companyId: string, localAccountId: string, ctx: TenantContext): DbGroupChartOfAccounts | undefined {
    const mappings = db.getGroupAccountMappings(groupId, companyId);
    const directMapping = mappings.find((m) => m.localAccountId === localAccountId && m.status === 'active');

    const groupAccounts = db.getGroupChartOfAccounts(groupId);
    if (directMapping) {
      return groupAccounts.find((ga) => ga.id === directMapping.groupAccountId);
    }

    // Fallback: match by local account code / classification
    const localAccounts = db.getAccounts(ctx);
    const localAcc = localAccounts.find((a) => a.id === localAccountId);
    if (localAcc) {
      return (
        groupAccounts.find((ga) => ga.code === localAcc.code) ||
        groupAccounts.find((ga) => ga.classification === localAcc.classification)
      );
    }

    return undefined;
  }
}

export const groupCoaService = new GroupCoaService();
