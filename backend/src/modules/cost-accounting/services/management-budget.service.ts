// ============================================================================
// Multi-Version Management Budgeting & Budget vs Actual (BvA) Engine (Phase 13)
// ============================================================================

import { db } from '@/database/storage';
import { 
  DbManagementBudget, 
  DbManagementBudgetLine, 
  BudgetPeriodType, 
  BudgetStatus 
} from '@/database/types';
import { TenantContext } from '@/core/types/common';
import { DomainValidationError } from '@/core/errors/DomainErrors';

export interface BudgetVsActualRow {
  accountId: string;
  accountCode: string;
  accountName: string;
  classification: string;
  accountType: string;
  branchId?: string;
  departmentId?: string;
  costCenterId?: string;
  businessUnitId?: string;
  projectId?: string;
  periodNumber?: number;
  budgetAmount: string;
  actualAmount: string;
  varianceAmount: string;
  variancePercentage: string;
  isFavorable: boolean;
}

export interface BudgetVsActualReport {
  budgetId: string;
  budgetName: string;
  budgetCode: string;
  version: number;
  status: BudgetStatus;
  fiscalYearName: string;
  currency: string;
  totalPlannedRevenue: string;
  totalActualRevenue: string;
  revenueVariance: string;
  totalPlannedCost: string;
  totalActualCost: string;
  costVariance: string;
  netPlannedProfit: string;
  netActualProfit: string;
  profitVariance: string;
  isOverallFavorable: boolean;
  rows: BudgetVsActualRow[];
}

export class ManagementBudgetService {
  public getBudgets(ctx: TenantContext): DbManagementBudget[] {
    const list = db.getManagementBudgets(ctx);
    if (list.length === 0) {
      // Seed default annual corporate budget
      const fiscalYears = db.getFiscalYears(ctx);
      const fy = fiscalYears[0];
      const accounts = db.getAccounts(ctx);
      const revAcc = accounts.find((a) => a.code === '4010') || accounts[0];
      const salAcc = accounts.find((a) => a.code === '6010') || accounts[0];
      const rentAcc = accounts.find((a) => a.code === '6020') || accounts[0];
      const utilAcc = accounts.find((a) => a.code === '6030') || accounts[0];

      const defaultBudget: Omit<DbManagementBudget, 'id' | 'companyId' | 'createdAt' | 'updatedAt'> = {
        budgetName: 'FY2026 Enterprise Corporate Operating Budget',
        code: 'BUD-2026-CORP',
        fiscalYearId: fy ? fy.id : 'fy-2026',
        periodType: 'annual',
        startDate: fy ? fy.startDate : '2026-01-01',
        endDate: fy ? fy.endDate : '2026-12-31',
        currency: ctx.baseCurrency,
        status: 'approved',
        version: 1,
        totalPlannedRevenue: '250000.0000',
        totalPlannedCost: '145000.0000',
        totalPlannedProfit: '105000.0000',
        lines: [
          { id: 'bgl-1', budgetId: 'mbg-corp', accountId: revAcc.id, accountCode: revAcc.code, accountName: revAcc.name, costCategory: 'revenue', plannedAmount: '250000.0000' },
          { id: 'bgl-2', budgetId: 'mbg-corp', accountId: salAcc.id, accountCode: salAcc.code, accountName: salAcc.name, costCategory: 'direct_labor', plannedAmount: '80000.0000' },
          { id: 'bgl-3', budgetId: 'mbg-corp', accountId: rentAcc.id, accountCode: rentAcc.code, accountName: rentAcc.name, costCategory: 'overhead', plannedAmount: '45000.0000' },
          { id: 'bgl-4', budgetId: 'mbg-corp', accountId: utilAcc.id, accountCode: utilAcc.code, accountName: utilAcc.name, costCategory: 'operating_expense', plannedAmount: '20000.0000' },
        ],
      };
      return [db.createManagementBudget(defaultBudget, ctx)];
    }
    return list;
  }

  public getBudgetById(id: string, ctx: TenantContext): DbManagementBudget | undefined {
    return db.getManagementBudgetById(id, ctx);
  }

  public createBudget(
    payload: {
      budgetName: string;
      code: string;
      fiscalYearId: string;
      periodType: BudgetPeriodType;
      startDate: string;
      endDate: string;
      currency?: string;
      branchId?: string;
      departmentId?: string;
      costCenterId?: string;
      businessUnitId?: string;
      projectId?: string;
      lines: Array<{
        accountId: string;
        costCategory?: string;
        branchId?: string;
        departmentId?: string;
        costCenterId?: string;
        businessUnitId?: string;
        projectId?: string;
        periodNumber?: number;
        plannedAmount: string;
        notes?: string;
      }>;
      notes?: string;
    },
    ctx: TenantContext
  ): DbManagementBudget {
    const existing = db.getManagementBudgets(ctx).find((b) => b.code === payload.code);
    if (existing) {
      throw new DomainValidationError(`Budget code '${payload.code}' already exists.`);
    }

    const accounts = db.getAccounts(ctx);
    let totalPlannedRev = 0;
    let totalPlannedCst = 0;

    const budgetLines: DbManagementBudgetLine[] = payload.lines.map((l, idx) => {
      const acc = accounts.find((a) => a.id === l.accountId);
      const amt = parseFloat(l.plannedAmount) || 0;
      if (acc?.classification === 'revenue' || acc?.accountType === 'revenue') {
        totalPlannedRev += amt;
      } else {
        totalPlannedCst += amt;
      }

      return {
        id: `bgl-${Date.now().toString(36)}-${idx}`,
        budgetId: '',
        accountId: l.accountId,
        accountCode: acc ? acc.code : 'UNKNOWN',
        accountName: acc ? acc.name : 'Unknown Account',
        costCategory: l.costCategory as any,
        branchId: l.branchId || payload.branchId,
        departmentId: l.departmentId || payload.departmentId,
        costCenterId: l.costCenterId || payload.costCenterId,
        businessUnitId: l.businessUnitId || payload.businessUnitId,
        projectId: l.projectId || payload.projectId,
        periodNumber: l.periodNumber,
        plannedAmount: amt.toFixed(4),
        notes: l.notes,
      };
    });

    const totalPlannedProf = totalPlannedRev - totalPlannedCst;

    return db.createManagementBudget({
      budgetName: payload.budgetName,
      code: payload.code,
      fiscalYearId: payload.fiscalYearId,
      periodType: payload.periodType,
      startDate: payload.startDate,
      endDate: payload.endDate,
      currency: payload.currency || ctx.baseCurrency,
      status: 'draft',
      version: 1,
      branchId: payload.branchId,
      departmentId: payload.departmentId,
      costCenterId: payload.costCenterId,
      businessUnitId: payload.businessUnitId,
      projectId: payload.projectId,
      totalPlannedRevenue: totalPlannedRev.toFixed(4),
      totalPlannedCost: totalPlannedCst.toFixed(4),
      totalPlannedProfit: totalPlannedProf.toFixed(4),
      lines: budgetLines,
      notes: payload.notes,
    }, ctx);
  }

  /**
   * Submits draft budget for approval
   */
  public submitBudget(budgetId: string, ctx: TenantContext): DbManagementBudget {
    const budget = db.getManagementBudgetById(budgetId, ctx);
    if (!budget) throw new DomainValidationError(`Budget '${budgetId}' not found.`);
    if (budget.status !== 'draft') {
      throw new DomainValidationError(`Only draft budgets can be submitted. Current: '${budget.status}'`);
    }

    return db.updateManagementBudget(budgetId, {
      status: 'submitted',
      submittedById: ctx.userId,
      submittedAt: new Date().toISOString(),
    }, ctx);
  }

  /**
   * Approves budget and marks it active
   */
  public approveBudget(budgetId: string, ctx: TenantContext): DbManagementBudget {
    const budget = db.getManagementBudgetById(budgetId, ctx);
    if (!budget) throw new DomainValidationError(`Budget '${budgetId}' not found.`);

    return db.updateManagementBudget(budgetId, {
      status: 'approved',
      approvedById: ctx.userId,
      approvedAt: new Date().toISOString(),
    }, ctx);
  }

  /**
   * Creates a new controlled budget version revision
   */
  public createRevision(budgetId: string, reason: string, ctx: TenantContext): DbManagementBudget {
    const original = db.getManagementBudgetById(budgetId, ctx);
    if (!original) throw new DomainValidationError(`Budget '${budgetId}' not found.`);

    // Archive or close original
    db.updateManagementBudget(budgetId, { status: 'closed', closedAt: new Date().toISOString() }, ctx);

    const newVersion = original.version + 1;
    const newCode = `${original.code}-V${newVersion}`;

    return db.createManagementBudget({
      budgetName: `${original.budgetName} (Rev ${newVersion})`,
      code: newCode,
      fiscalYearId: original.fiscalYearId,
      periodType: original.periodType,
      startDate: original.startDate,
      endDate: original.endDate,
      currency: original.currency,
      status: 'draft',
      version: newVersion,
      previousVersionId: original.id,
      branchId: original.branchId,
      departmentId: original.departmentId,
      costCenterId: original.costCenterId,
      businessUnitId: original.businessUnitId,
      projectId: original.projectId,
      totalPlannedRevenue: original.totalPlannedRevenue,
      totalPlannedCost: original.totalPlannedCost,
      totalPlannedProfit: original.totalPlannedProfit,
      lines: [...original.lines],
      notes: reason,
    }, ctx);
  }

  /**
   * Generates real-time Budget vs Actual (BvA) report
   */
  public getBudgetVsActualReport(
    budgetId: string, 
    filters?: {
      branchId?: string;
      departmentId?: string;
      costCenterId?: string;
      businessUnitId?: string;
      projectId?: string;
    },
    ctx?: TenantContext
  ): BudgetVsActualReport {
    const tenantCtx = ctx || { companyId: 'c1000000-0000-0000-0000-000000000001', baseCurrency: 'USD' } as TenantContext;
    const budget = db.getManagementBudgetById(budgetId, tenantCtx);
    if (!budget) throw new DomainValidationError(`Budget '${budgetId}' not found.`);

    const fiscalYears = db.getFiscalYears(tenantCtx);
    const fy = fiscalYears.find((f) => f.id === budget.fiscalYearId);
    const accounts = db.getAccounts(tenantCtx);
    const journals = db.getJournalEntries(tenantCtx).filter((j) => j.status === 'posted');

    let totalPlannedRev = 0;
    let totalActualRev = 0;
    let totalPlannedCst = 0;
    let totalActualCst = 0;

    const rows: BudgetVsActualRow[] = [];

    for (const bLine of budget.lines) {
      if (filters?.branchId && bLine.branchId && bLine.branchId !== filters.branchId) continue;
      if (filters?.departmentId && bLine.departmentId && bLine.departmentId !== filters.departmentId) continue;
      if (filters?.costCenterId && bLine.costCenterId && bLine.costCenterId !== filters.costCenterId) continue;
      if (filters?.businessUnitId && bLine.businessUnitId && bLine.businessUnitId !== filters.businessUnitId) continue;
      if (filters?.projectId && bLine.projectId && bLine.projectId !== filters.projectId) continue;

      const acc = accounts.find((a) => a.id === bLine.accountId);
      const isRevenue = acc?.classification === 'revenue' || acc?.accountType === 'revenue';
      const plannedAmt = parseFloat(bLine.plannedAmount || '0');

      // Compute actuals from GL lines in budget timeframe
      let actualAmt = 0;
      for (const journal of journals) {
        if (journal.postingDate < budget.startDate || journal.postingDate > budget.endDate) continue;
        if (filters?.branchId && journal.branchId !== filters.branchId) continue;

        for (const line of journal.lines) {
          if (line.accountId !== bLine.accountId) continue;
          if (bLine.departmentId && line.departmentId !== bLine.departmentId) continue;
          if (bLine.costCenterId && line.costCenterId !== bLine.costCenterId) continue;
          if (bLine.businessUnitId && line.businessUnitId !== bLine.businessUnitId) continue;
          if (bLine.projectId && line.projectId !== bLine.projectId) continue;

          const deb = parseFloat(line.baseDebit || line.debitAmount || '0');
          const cred = parseFloat(line.baseCredit || line.creditAmount || '0');

          if (isRevenue) {
            actualAmt += (cred - deb);
          } else {
            actualAmt += (deb - cred);
          }
        }
      }

      if (isRevenue) {
        totalPlannedRev += plannedAmt;
        totalActualRev += actualAmt;
      } else {
        totalPlannedCst += plannedAmt;
        totalActualCst += actualAmt;
      }

      // Variance Calculation:
      // For Revenue: Actual - Budget (positive is favorable)
      // For Cost: Budget - Actual (positive is favorable)
      const varianceAmt = isRevenue ? (actualAmt - plannedAmt) : (plannedAmt - actualAmt);
      const variancePct = plannedAmt > 0 ? ((varianceAmt / plannedAmt) * 100).toFixed(2) : '0.00';
      const isFavorable = varianceAmt >= 0;

      rows.push({
        accountId: bLine.accountId,
        accountCode: bLine.accountCode,
        accountName: bLine.accountName,
        classification: acc ? acc.classification : 'expense',
        accountType: acc ? acc.accountType : 'expense',
        branchId: bLine.branchId,
        departmentId: bLine.departmentId,
        costCenterId: bLine.costCenterId,
        businessUnitId: bLine.businessUnitId,
        projectId: bLine.projectId,
        periodNumber: bLine.periodNumber,
        budgetAmount: plannedAmt.toFixed(4),
        actualAmount: actualAmt.toFixed(4),
        varianceAmount: varianceAmt.toFixed(4),
        variancePercentage: variancePct,
        isFavorable,
      });
    }

    const netPlannedProfit = totalPlannedRev - totalPlannedCst;
    const netActualProfit = totalActualRev - totalActualCst;
    const profitVariance = netActualProfit - netPlannedProfit;
    const revVariance = totalActualRev - totalPlannedRev;
    const cstVariance = totalPlannedCst - totalActualCst;

    return {
      budgetId: budget.id,
      budgetName: budget.budgetName,
      budgetCode: budget.code,
      version: budget.version,
      status: budget.status,
      fiscalYearName: fy ? fy.name : 'FY2026',
      currency: budget.currency,
      totalPlannedRevenue: totalPlannedRev.toFixed(4),
      totalActualRevenue: totalActualRev.toFixed(4),
      revenueVariance: revVariance.toFixed(4),
      totalPlannedCost: totalPlannedCst.toFixed(4),
      totalActualCost: totalActualCst.toFixed(4),
      costVariance: cstVariance.toFixed(4),
      netPlannedProfit: netPlannedProfit.toFixed(4),
      netActualProfit: netActualProfit.toFixed(4),
      profitVariance: profitVariance.toFixed(4),
      isOverallFavorable: profitVariance >= 0,
      rows,
    };
  }
}

export const managementBudgetService = new ManagementBudgetService();
