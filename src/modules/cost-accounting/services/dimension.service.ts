// ============================================================================
// Management Dimension Framework & Propagation Service (Phase 13)
// ============================================================================

import { db } from '@/database/storage';
import { 
  DbManagementDimension, 
  ManagementDimensionType 
} from '@/database/types';
import { TenantContext } from '@/core/types/common';
import { DomainValidationError } from '@/core/errors/DomainErrors';

export interface PropagatedDimensions {
  branchId?: string;
  departmentId?: string;
  costCenterId?: string;
  businessUnitId?: string;
  projectId?: string;
  employeeId?: string;
  customerId?: string;
  supplierId?: string;
  dimensions?: Record<string, string>;
}

export interface DimensionValidationRuleInput {
  module: 'sales' | 'purchases' | 'payroll' | 'inventory' | 'assets' | 'projects' | 'general';
  accountType?: string;
  amount: string;
  branchId?: string;
  departmentId?: string;
  costCenterId?: string;
  businessUnitId?: string;
  projectId?: string;
}

export class DimensionService {
  /**
   * Retrieves all active management dimensions configured for company
   */
  public getDimensions(ctx: TenantContext): DbManagementDimension[] {
    const list = db.getManagementDimensions(ctx);
    if (list.length === 0) {
      // Return standard default dimension registry
      return [
        { id: 'dim-br', companyId: ctx.companyId, code: 'BRANCH', name: 'Operating Branch', type: 'branch', isRequired: false, appliesTo: ['all'], isActive: true, createdAt: '2026-01-01T00:00:00Z' },
        { id: 'dim-dept', companyId: ctx.companyId, code: 'DEPT', name: 'Organizational Department', type: 'department', isRequired: false, appliesTo: ['expense'], isActive: true, createdAt: '2026-01-01T00:00:00Z' },
        { id: 'dim-cc', companyId: ctx.companyId, code: 'COST_CENTER', name: 'Operational Cost Center', type: 'cost_center', isRequired: false, appliesTo: ['expense'], isActive: true, createdAt: '2026-01-01T00:00:00Z' },
        { id: 'dim-bu', companyId: ctx.companyId, code: 'BUSINESS_UNIT', name: 'Business Unit / Division', type: 'business_unit', isRequired: false, appliesTo: ['all'], isActive: true, createdAt: '2026-01-01T00:00:00Z' },
        { id: 'dim-prj', companyId: ctx.companyId, code: 'PROJECT', name: 'Capital / Client Project', type: 'project', isRequired: false, appliesTo: ['all'], isActive: true, createdAt: '2026-01-01T00:00:00Z' },
      ];
    }
    return list;
  }

  /**
   * Automatically resolves and derives dimensions from source operational entities
   * Prevents users from having to re-enter known organizational hierarchies.
   */
  public resolveAutoPropagatedDimensions(
    source: {
      customerId?: string;
      supplierId?: string;
      employeeId?: string;
      warehouseId?: string;
      projectId?: string;
      explicitBranchId?: string;
      explicitDepartmentId?: string;
      explicitCostCenterId?: string;
      explicitBusinessUnitId?: string;
    },
    ctx: TenantContext
  ): PropagatedDimensions {
    const result: PropagatedDimensions = {
      branchId: source.explicitBranchId,
      departmentId: source.explicitDepartmentId,
      costCenterId: source.explicitCostCenterId,
      businessUnitId: source.explicitBusinessUnitId,
      projectId: source.projectId,
      customerId: source.customerId,
      supplierId: source.supplierId,
      employeeId: source.employeeId,
      dimensions: {},
    };

    // 1. Resolve from Project Master
    if (source.projectId) {
      const prj = db.getProjectById(source.projectId, ctx);
      if (prj) {
        if (!result.customerId && prj.customerId) result.customerId = prj.customerId;
        if (!result.branchId && prj.branchId) result.branchId = prj.branchId;
        if (!result.departmentId && prj.departmentId) result.departmentId = prj.departmentId;
        if (!result.costCenterId && prj.costCenterId) result.costCenterId = prj.costCenterId;
        if (!result.businessUnitId && prj.businessUnit) {
          const buList = db.getBusinessUnits(ctx);
          const bu = buList.find((b) => b.name === prj.businessUnit || b.code === prj.businessUnit);
          if (bu) result.businessUnitId = bu.id;
        }
      }
    }

    // 2. Resolve from Employee Master
    if (source.employeeId) {
      const emp = db.getEmployees(ctx).find((e) => e.id === source.employeeId);
      if (emp) {
        if (!result.departmentId && emp.departmentId) result.departmentId = emp.departmentId;
        if (!result.branchId && emp.branchId) result.branchId = emp.branchId;
        if (!result.costCenterId && emp.costCenterId) result.costCenterId = emp.costCenterId;
      }
    }

    // 3. Resolve from Cost Center hierarchy
    if (result.costCenterId && !result.departmentId) {
      const cc = db.getCostCenterById(result.costCenterId, ctx);
      if (cc && cc.departmentId) {
        result.departmentId = cc.departmentId;
        if (!result.branchId && cc.branchId) result.branchId = cc.branchId;
      }
    }

    // 4. Resolve from Department hierarchy
    if (result.departmentId && !result.branchId) {
      const dept = db.getDepartmentById(result.departmentId, ctx);
      if (dept && dept.branchId) {
        result.branchId = dept.branchId;
      }
    }

    return result;
  }

  /**
   * Enforces business dimension validation rules before journal commit
   */
  public validateDimensions(input: DimensionValidationRuleInput, ctx: TenantContext): void {
    const configuredDimensions = this.getDimensions(ctx);

    for (const dim of configuredDimensions) {
      if (!dim.isRequired || !dim.isActive) continue;

      const isExpense = input.module === 'purchases' || input.module === 'payroll' || input.accountType === 'expense';
      const isRevenue = input.module === 'sales' || input.accountType === 'revenue';

      const applies = dim.appliesTo.includes('all') ||
        (isExpense && dim.appliesTo.includes('expense')) ||
        (isRevenue && dim.appliesTo.includes('revenue'));

      if (!applies) continue;

      switch (dim.type) {
        case 'branch':
          if (!input.branchId) {
            throw new DomainValidationError(`Branch is required for this ${input.module} transaction.`);
          }
          break;
        case 'department':
          if (!input.departmentId) {
            throw new DomainValidationError(`Department is required for this ${input.module} transaction.`);
          }
          break;
        case 'cost_center':
          if (!input.costCenterId) {
            throw new DomainValidationError(`Cost Center is required for this ${input.module} transaction.`);
          }
          break;
        case 'business_unit':
          if (!input.businessUnitId) {
            throw new DomainValidationError(`Business Unit is required for this ${input.module} transaction.`);
          }
          break;
        case 'project':
          if (!input.projectId) {
            throw new DomainValidationError(`Project is required for this ${input.module} transaction.`);
          }
          break;
      }
    }
  }

  /**
   * Configures or updates a dimension rule
   */
  public saveDimensionRule(
    input: {
      code: string;
      name: string;
      type: ManagementDimensionType;
      isRequired: boolean;
      appliesTo: ('revenue' | 'expense' | 'all')[];
      isActive: boolean;
      description?: string;
    },
    ctx: TenantContext
  ): DbManagementDimension {
    const existing = db.getManagementDimensions(ctx).find((d) => d.code === input.code);
    if (existing) {
      return db.updateManagementDimension(existing.id, input, ctx);
    }
    return db.createManagementDimension(input, ctx);
  }
}

export const dimensionService = new DimensionService();
