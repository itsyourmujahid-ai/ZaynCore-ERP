// ============================================================================
// Cost Center Management & P&L Calculation Service (Phase 13)
// ============================================================================

import { db } from '@/database/storage';
import { DbCostCenter } from '@/database/types';
import { TenantContext } from '@/core/types/common';
import { DomainValidationError } from '@/core/errors/DomainErrors';

export interface CostCenterPnLSummary {
  costCenterId: string;
  costCenterCode: string;
  costCenterName: string;
  departmentId?: string;
  departmentName?: string;
  branchId?: string;
  branchName?: string;
  budgetAmount: string;
  actualCost: string;
  actualRevenue: string;
  allocatedOverhead: string;
  totalCost: string;
  netProfit: string;
  marginPercentage: string;
  varianceAmount: string;
  variancePercentage: string;
  isFavorable: boolean;
  status: string;
}

export interface CostCenterTransactionRow {
  journalEntryId: string;
  entryNumber: string;
  postingDate: string;
  sourceModule: string;
  documentNumber: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  description: string;
  debitAmount: string;
  creditAmount: string;
  amount: string;
  currency: string;
}

export class CostCenterService {
  public getCostCenters(ctx: TenantContext): DbCostCenter[] {
    return db.getCostCenters(ctx);
  }

  public getCostCenterById(id: string, ctx: TenantContext): DbCostCenter | undefined {
    return db.getCostCenterById(id, ctx);
  }

  public createCostCenter(
    payload: {
      code: string;
      name: string;
      description?: string;
      branchId?: string;
      departmentId?: string;
      managerName?: string;
      parentCostCenterId?: string;
      startDate?: string;
      endDate?: string;
      budgetAmount?: string;
      notes?: string;
    },
    ctx: TenantContext
  ): DbCostCenter {
    const existing = db.getCostCenters(ctx).find((c) => c.code === payload.code);
    if (existing) {
      throw new DomainValidationError(`Cost Center code '${payload.code}' already exists.`);
    }

    return db.createCostCenter({
      ...payload,
      budgetAmount: payload.budgetAmount || '0.0000',
      status: 'active',
    }, ctx);
  }

  public updateCostCenter(
    id: string,
    payload: Partial<DbCostCenter>,
    ctx: TenantContext
  ): DbCostCenter {
    return db.updateCostCenter(id, payload, ctx);
  }

  /**
   * Calculates dynamic P&L and Budget Variance for a specific Cost Center
   */
  public calculateCostCenterPnL(costCenterId: string, ctx: TenantContext): CostCenterPnLSummary {
    const cc = db.getCostCenterById(costCenterId, ctx);
    if (!cc) throw new DomainValidationError(`Cost Center '${costCenterId}' not found.`);

    const depts = db.getDepartments(ctx);
    const branches = db.getBranches(ctx);
    const accounts = db.getAccounts(ctx);
    const journals = db.getJournalEntries(ctx).filter((j) => j.status === 'posted');

    const dept = depts.find((d) => d.id === cc.departmentId);
    const branch = branches.find((b) => b.id === cc.branchId);

    let actualCostNum = 0;
    let actualRevenueNum = 0;
    let allocatedOverheadNum = 0;

    for (const journal of journals) {
      for (const line of journal.lines) {
        if (line.costCenterId !== costCenterId) continue;

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
            actualCostNum += (deb - cred);
          }
        }
      }
    }

    const totalCostNum = actualCostNum + allocatedOverheadNum;
    const netProfitNum = actualRevenueNum - totalCostNum;
    const marginPct = actualRevenueNum > 0 ? ((netProfitNum / actualRevenueNum) * 100).toFixed(2) : '0.00';

    const budgetNum = parseFloat(cc.budgetAmount || '0');
    const varianceNum = budgetNum - totalCostNum;
    const variancePct = budgetNum > 0 ? ((varianceNum / budgetNum) * 100).toFixed(2) : '0.00';
    const isFavorable = varianceNum >= 0;

    return {
      costCenterId: cc.id,
      costCenterCode: cc.code,
      costCenterName: cc.name,
      departmentId: cc.departmentId,
      departmentName: dept ? dept.name : undefined,
      branchId: cc.branchId,
      branchName: branch ? branch.name : undefined,
      budgetAmount: budgetNum.toFixed(4),
      actualCost: actualCostNum.toFixed(4),
      actualRevenue: actualRevenueNum.toFixed(4),
      allocatedOverhead: allocatedOverheadNum.toFixed(4),
      totalCost: totalCostNum.toFixed(4),
      netProfit: netProfitNum.toFixed(4),
      marginPercentage: marginPct,
      varianceAmount: varianceNum.toFixed(4),
      variancePercentage: variancePct,
      isFavorable,
      status: cc.status,
    };
  }

  /**
   * Retrieves all individual posted transactions attributed to a cost center
   */
  public getCostCenterTransactions(costCenterId: string, ctx: TenantContext): CostCenterTransactionRow[] {
    const cc = db.getCostCenterById(costCenterId, ctx);
    if (!cc) throw new DomainValidationError(`Cost Center '${costCenterId}' not found.`);

    const accounts = db.getAccounts(ctx);
    const journals = db.getJournalEntries(ctx).filter((j) => j.status === 'posted');
    const rows: CostCenterTransactionRow[] = [];

    for (const journal of journals) {
      for (const line of journal.lines) {
        if (line.costCenterId !== costCenterId) continue;

        const acc = accounts.find((a) => a.id === line.accountId);
        const deb = parseFloat(line.baseDebit || line.debitAmount || '0');
        const cred = parseFloat(line.baseCredit || line.creditAmount || '0');
        const netAmt = deb > 0 ? deb : cred;

        rows.push({
          journalEntryId: journal.id,
          entryNumber: journal.entryNumber,
          postingDate: journal.postingDate,
          sourceModule: journal.sourceModule,
          documentNumber: journal.entryNumber,
          accountCode: acc ? acc.code : 'UNKNOWN',
          accountName: acc ? acc.name : 'Unknown Account',
          accountType: acc ? acc.classification : 'expense',
          description: line.description || journal.memo,
          debitAmount: line.debitAmount,
          creditAmount: line.creditAmount,
          amount: netAmt.toFixed(4),
          currency: line.currency || journal.currency,
        });
      }
    }

    rows.sort((a, b) => b.postingDate.localeCompare(a.postingDate));
    return rows;
  }
}

export const costCenterService = new CostCenterService();
