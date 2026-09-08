// ============================================================================
// Company Relationship & Group Structure Domain Service (Phase 14)
// ============================================================================

import { db } from '@/database/storage';
import { 
  DbCompanyGroup, 
  DbCompanyRelationship, 
  CompanyRelationshipType 
} from '@/database/types';
import { TenantContext } from '@/core/types/common';
import { ValidationError, NotFoundError } from '@/core/errors/DomainErrors';
import { parseDecimal, formatDecimal } from '@/core/utils/money';

export interface CreateCompanyGroupDTO {
  code: string;
  name: string;
  parentCompanyId: string;
  reportingCurrency: string;
  notes?: string;
}

export interface CreateCompanyRelationshipDTO {
  groupId: string;
  parentCompanyId: string;
  childCompanyId: string;
  relationshipType: CompanyRelationshipType;
  ownershipPercentage: string; // e.g. "80.0000"
  effectiveFrom: string;       // YYYY-MM-DD
  effectiveTo?: string;
  notes?: string;
}

export interface GroupHierarchyNode {
  companyId: string;
  companyName: string;
  companyCode: string;
  baseCurrency: string;
  tier: string;
  relationshipType?: CompanyRelationshipType;
  ownershipPercentage: string;
  effectiveOwnershipPercentage: string;
  children: GroupHierarchyNode[];
}

export class CompanyRelationshipService {
  // --------------------------------------------------------------------------
  // Group Entities
  // --------------------------------------------------------------------------
  public getGroups(): DbCompanyGroup[] {
    return db.getCompanyGroups();
  }

  public getGroupById(id: string): DbCompanyGroup {
    const group = db.getCompanyGroupById(id);
    if (!group) {
      throw new NotFoundError('CompanyGroup', id);
    }
    return group;
  }

  public createGroup(dto: CreateCompanyGroupDTO, ctx: TenantContext): DbCompanyGroup {
    if (!dto.code || !dto.name || !dto.parentCompanyId) {
      throw new ValidationError('Group code, name, and parent company are required.');
    }

    const parentCompany = db.getCompanyById(dto.parentCompanyId, ctx);
    if (!parentCompany) {
      throw new NotFoundError('Company', dto.parentCompanyId);
    }

    const existing = db.getCompanyGroups().find((g) => g.code.toUpperCase() === dto.code.toUpperCase());
    if (existing) {
      throw new ValidationError(`Company group code '${dto.code}' already exists.`);
    }

    return db.createCompanyGroup({
      code: dto.code.toUpperCase(),
      name: dto.name,
      parentCompanyId: dto.parentCompanyId,
      reportingCurrency: dto.reportingCurrency || parentCompany.baseCurrency,
      status: 'active',
      notes: dto.notes,
    }, ctx);
  }

  public updateGroup(id: string, dto: Partial<CreateCompanyGroupDTO>, ctx: TenantContext): DbCompanyGroup {
    this.getGroupById(id);
    return db.updateCompanyGroup(id, dto, ctx);
  }

  // --------------------------------------------------------------------------
  // Relationships & Ownership
  // --------------------------------------------------------------------------
  public getRelationships(groupId?: string): DbCompanyRelationship[] {
    return db.getCompanyRelationships(groupId);
  }

  public createRelationship(dto: CreateCompanyRelationshipDTO, ctx: TenantContext): DbCompanyRelationship {
    if (!dto.groupId || !dto.parentCompanyId || !dto.childCompanyId) {
      throw new ValidationError('Group, parent company, and child company are required.');
    }

    if (dto.parentCompanyId === dto.childCompanyId) {
      throw new ValidationError('Parent company and child company cannot be the same entity.');
    }

    const parentCompany = db.getCompanyById(dto.parentCompanyId, ctx);
    const childCompany = db.getCompanyById(dto.childCompanyId, ctx);
    if (!parentCompany || !childCompany) {
      throw new ValidationError('One or both companies in the relationship do not exist.');
    }

    const ownershipNum = parseFloat(dto.ownershipPercentage || '100');
    if (isNaN(ownershipNum) || ownershipNum <= 0 || ownershipNum > 100) {
      throw new ValidationError('Ownership percentage must be a valid number between 0.0001% and 100.0000%.');
    }

    // Check for duplicate active relationship between same parent & child
    const existing = db.getCompanyRelationships(dto.groupId).find(
      (r) => r.parentCompanyId === dto.parentCompanyId && r.childCompanyId === dto.childCompanyId && r.status === 'active'
    );
    if (existing) {
      throw new ValidationError(`Active relationship between parent ${dto.parentCompanyId} and child ${dto.childCompanyId} already exists.`);
    }

    return db.createCompanyRelationship({
      groupId: dto.groupId,
      parentCompanyId: dto.parentCompanyId,
      childCompanyId: dto.childCompanyId,
      relationshipType: dto.relationshipType || 'parent_subsidiary',
      ownershipPercentage: formatDecimal(parseDecimal(dto.ownershipPercentage || '100')),
      effectiveFrom: dto.effectiveFrom || new Date().toISOString().split('T')[0],
      effectiveTo: dto.effectiveTo,
      status: 'active',
      notes: dto.notes,
    }, ctx);
  }

  public updateRelationship(id: string, dto: Partial<CreateCompanyRelationshipDTO>, ctx: TenantContext): DbCompanyRelationship {
    const rel = db.getCompanyRelationshipById(id);
    if (!rel) throw new NotFoundError('CompanyRelationship', id);
    return db.updateCompanyRelationship(id, dto, ctx);
  }

  // --------------------------------------------------------------------------
  // Group Hierarchy & Effective Ownership Calculation
  // --------------------------------------------------------------------------
  public getGroupHierarchy(groupId: string, _ctx?: TenantContext): GroupHierarchyNode {
    const group = this.getGroupById(groupId);
    const allRelationships = db.getCompanyRelationships(groupId).filter((r) => r.status === 'active');
    const allCompanies = db.getCompanies();

    const parentCompany = allCompanies.find((c) => c.id === group.parentCompanyId);
    if (!parentCompany) {
      throw new NotFoundError('ParentCompany', group.parentCompanyId);
    }

    const buildNode = (
      companyId: string,
      relType?: CompanyRelationshipType,
      directOwnership: string = '100.0000',
      parentEffectiveOwnership: number = 1.0
    ): GroupHierarchyNode => {
      const comp = allCompanies.find((c) => c.id === companyId) || {
        id: companyId,
        name: 'Unknown Company',
        code: 'UNKNOWN',
        baseCurrency: group.reportingCurrency,
        tier: 'enterprise',
      };

      const directRatio = parseFloat(directOwnership) / 100;
      const effectiveRatio = parentEffectiveOwnership * directRatio;
      const effectiveOwnershipStr = (effectiveRatio * 100).toFixed(4);

      const childRels = allRelationships.filter((r) => r.parentCompanyId === companyId);
      const children = childRels.map((cr) =>
        buildNode(cr.childCompanyId, cr.relationshipType, cr.ownershipPercentage, effectiveRatio)
      );

      return {
        companyId: comp.id,
        companyName: comp.name,
        companyCode: comp.code,
        baseCurrency: comp.baseCurrency,
        tier: comp.tier,
        relationshipType: relType,
        ownershipPercentage: directOwnership,
        effectiveOwnershipPercentage: effectiveOwnershipStr,
        children,
      };
    };

    return buildNode(parentCompany.id);
  }
}

export const companyRelationshipService = new CompanyRelationshipService();
