// ============================================================================
// Management Accounting Reports & CSV Export Engine (Phase 13)
// ============================================================================

import { TenantContext } from '@/core/types/common';
import { costCenterService } from './cost-center.service';
import { managementBudgetService } from './management-budget.service';
import { managementPnLService } from './management-pnl.service';
import { costAllocationService } from './cost-allocation.service';

export class CostAccountingReportsService {
  /**
   * Generates CSV for Management P&L Statement
   */
  public exportManagementPnLToCsv(ctx: TenantContext): string {
    const pnl = managementPnLService.generateManagementPnL(undefined, ctx);
    const headers = ['Category', 'Account Code', 'Account Name', 'Amount', '% of Revenue'];
    const rows: string[][] = [headers];

    rows.push(['--- OPERATING REVENUE ---', '', '', '', '']);
    pnl.revenueLines.forEach((l) => rows.push(['Revenue', l.accountCode, l.accountName, l.amount, `${l.percentageOfRevenue}%`]));
    rows.push(['Total Operating Revenue', '', '', pnl.totalRevenue, '100.00%']);

    rows.push(['--- DIRECT COSTS (COGS) ---', '', '', '', '']);
    pnl.directCostLines.forEach((l) => rows.push([l.category, l.accountCode, l.accountName, l.amount, `${l.percentageOfRevenue}%`]));
    rows.push(['Total Direct Costs', '', '', pnl.totalDirectCosts, '']);
    rows.push(['GROSS PROFIT', '', '', pnl.grossProfit, `${pnl.grossMarginPercentage}%`]);

    rows.push(['--- OPERATING EXPENSES ---', '', '', '', '']);
    pnl.operatingExpenseLines.forEach((l) => rows.push([l.category, l.accountCode, l.accountName, l.amount, `${l.percentageOfRevenue}%`]));
    rows.push(['Total Operating Expenses', '', '', pnl.totalOperatingExpenses, '']);
    rows.push(['OPERATING PROFIT (EBIT)', '', '', pnl.operatingProfit, `${pnl.operatingMarginPercentage}%`]);
    rows.push(['NET MANAGEMENT PROFIT', '', '', pnl.netProfit, `${pnl.netMarginPercentage}%`]);

    return rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
  }

  /**
   * Generates CSV for Cost Centers Performance Summary
   */
  public exportCostCentersToCsv(ctx: TenantContext): string {
    const costCenters = costCenterService.getCostCenters(ctx);
    const headers = ['Code', 'Cost Center Name', 'Department', 'Branch', 'Budget', 'Actual Cost', 'Actual Revenue', 'Net Profit', 'Variance', 'Status'];
    const rows: string[][] = [headers];

    costCenters.forEach((cc) => {
      const pnl = costCenterService.calculateCostCenterPnL(cc.id, ctx);
      rows.push([
        pnl.costCenterCode,
        pnl.costCenterName,
        pnl.departmentName || 'N/A',
        pnl.branchName || 'N/A',
        pnl.budgetAmount,
        pnl.totalCost,
        pnl.actualRevenue,
        pnl.netProfit,
        pnl.varianceAmount,
        pnl.status,
      ]);
    });

    return rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
  }

  /**
   * Generates CSV for Budget vs Actual Variance Matrix
   */
  public exportBudgetVsActualToCsv(budgetId: string, ctx: TenantContext): string {
    const bva = managementBudgetService.getBudgetVsActualReport(budgetId, undefined, ctx);
    const headers = ['Account Code', 'Account Name', 'Classification', 'Planned Budget', 'Actual Incurred', 'Variance ($)', 'Variance (%)', 'Status'];
    const rows: string[][] = [headers];

    bva.rows.forEach((r) => {
      rows.push([
        r.accountCode,
        r.accountName,
        r.classification,
        r.budgetAmount,
        r.actualAmount,
        r.varianceAmount,
        `${r.variancePercentage}%`,
        r.isFavorable ? 'Favorable' : 'Unfavorable',
      ]);
    });

    rows.push(['TOTALS', '', '', bva.totalPlannedCost, bva.totalActualCost, bva.costVariance, '', bva.isOverallFavorable ? 'FAVORABLE' : 'UNFAVORABLE']);

    return rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
  }

  /**
   * Generates CSV for Cost Allocation Register
   */
  public exportAllocationsToCsv(ctx: TenantContext): string {
    const runs = costAllocationService.getRuns(ctx);
    const headers = ['Run Number', 'Date', 'Rule ID', 'Amount', 'Status', 'Journal Entry', 'Memo'];
    const rows: string[][] = [headers];

    runs.forEach((run) => {
      rows.push([
        run.runNumber,
        run.runDate,
        run.allocationRuleId,
        run.totalAllocatedAmount,
        run.status,
        run.journalEntryId || 'Pending',
        run.memo || '',
      ]);
    });

    return rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
  }
}

export const costAccountingReportsService = new CostAccountingReportsService();
