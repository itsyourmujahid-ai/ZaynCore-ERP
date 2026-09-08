// ============================================================================
// Department Accounting & Financial Analysis Service (Phase 13)
// ============================================================================

import { db } from '@/database/storage';
import { DbDepartment } from '@/database/types';
import { TenantContext } from '@/core/types/common';
import { DomainValidationError } from '@/core/errors/DomainErrors';

export interface DepartmentPnLSummary {
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  branchId?: string;
  branchName?: string;
  managerName?: string;
  budgetAmount: string;
  actualRevenue: string;
  directCost: string;
  allocatedOverhead: string;
  totalCost: string;
  netProfit: string;
  marginPercentage: string;
  varianceAmount: string;
  variancePercentage: string;
  isFavorable: boolean;
  costCentersCount: number;
}

export class DepartmentAccountingService {
  public getDepartments(ctx: TenantContext): DbDepartment[] {
    return db.getDepartments(ctx);
  }

  public getDepartmentById(id: string, ctx: TenantContext): DbDepartment | undefined {
    return db.getDepartmentById(id, ctx);
  }

  public createDepartment(
    payload: {
      code: string;
      name: string;
      description?: string;
      branchId?: string;
      managerName?: string;
      budgetAmount?: string;
    },
    ctx: TenantContext
  ): DbDepartment {
    const existing = db.getDepartments(ctx).find((d) => d.code === payload.code);
    if (existing) {
      throw new DomainValidationError(`Department code '${payload.code}' already exists.`);
    }

    return db.createDepartment({
      ...payload,
      budgetAmount: payload.budgetAmount || '0.0000',
      status: 'active',
    }, ctx);
  }

  public updateDepartment(
    id: string,
    payload: Partial<DbDepartment>,
    ctx: TenantContext
  ): DbDepartment {
    return db.updateDepartment(id, payload, ctx);
  }

  /**
   * Calculates Department P&L Summary from real General Ledger journals
   */
  public calculateDepartmentPnL(departmentId: string, ctx: TenantContext): DepartmentPnLSummary {
    const dept = db.getDepartmentById(departmentId, ctx);
    if (!dept) throw new DomainValidationError(`Department '${departmentId}' not found.`);

    const branches = db.getBranches(ctx);
    const branch = branches.find((b) => b.id === dept.branchId);
    const costCenters = db.getCostCenters(ctx).filter((cc) => cc.departmentId === departmentId);
    const accounts = db.getAccounts(ctx);
    const journals = db.getJournalEntries(ctx).filter((j) => j.status === 'posted');

    let actualRevenueNum = 0;
    let directCostNum = 0;
    let allocatedOverheadNum = 0;

    // Collect cost center IDs belonging to this department
    const ccIds = new Set(costCenters.map((cc) => cc.id));

    for (const journal of journals) {
      for (const line of journal.lines) {
        const matchesDeptDirect = line.departmentId === departmentId;
        const matchesViaCostCenter = line.costCenterId ? ccIds.has(line.costCenterId) : false;

        if (!matchesDeptDirect && !matchesViaCostCenter) continue;

        const acc = accounts.find((a) => a.id === line.accountId);
        if (!acc) continue;

        const deb = parseFloat(line.baseDebit || line.debitAmount || '0');
        const cred = parseFloat(line.baseCredit || line.creditAmount || '0');

        if (acc.classification === 'revenue' || acc.accountType === 'revenue') {
          actualRevenueNum += (cred - deb);
        } else if (acc.classification === 'expense' || acc.accountType === 'expense' || acc.accountType === 'cost_of_sales') {
          if (journal.postingEvent === 'COST_ALLOCATION_POSTED') {
            allocatedOverheadNum += (deb - cred);
          } else {
            directCostNum += (deb - cred);
          }
        }
      }
    }

    const totalCostNum = directCostNum + allocatedOverheadNum;
    const netProfitNum = actualRevenueNum - totalCostNum;
    const marginPct = actualRevenueNum > 0 ? ((netProfitNum / actualRevenueNum) * 100).toFixed(2) : '0.00';

    const budgetNum = parseFloat(dept.budgetAmount || '0');
    const varianceNum = budgetNum - totalCostNum;
    const variancePct = budgetNum > 0 ? ((varianceNum / budgetNum) * 100).toFixed(2) : '0.00';
    const isFavorable = varianceNum >= 0;

    return {
      departmentId: dept.id,
      departmentCode: dept.code,
      departmentName: dept.name,
      branchId: dept.branchId,
      branchName: branch ? branch.name : undefined,
      managerName: dept.managerName,
      budgetAmount: budgetNum.toFixed(4),
      actualRevenue: actualRevenueNum.toFixed(4),
      directCost: directCostNum.toFixed(4),
      allocatedOverhead: allocatedOverheadNum.toFixed(4),
      totalCost: totalCostNum.toFixed(4),
      netProfit: netProfitNum.toFixed(4),
      marginPercentage: marginPct,
      varianceAmount: varianceNum.toFixed(4),
      variancePercentage: variancePct,
      isFavorable,
      costCentersCount: costCenters.length,
    };
  }

  /**
   * Retrieves all departmental P&L summaries for company overview
   */
  public getDepartmentPortfolio(ctx: TenantContext): DepartmentPnLSummary[] {
    const depts = db.getDepartments(ctx);
    return depts.map((d) => this.calculateDepartmentPnL(d.id, ctx));
  }
}

export const departmentAccountingService = new DepartmentAccountingService();
