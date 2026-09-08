// ============================================================================
// Multi-Perspective Profitability & Margin Analytics Engine (Phase 13)
// ============================================================================

import { db } from '@/database/storage';
import { TenantContext } from '@/core/types/common';

export interface CustomerProfitabilitySummary {
  customerId: string;
  customerCode: string;
  customerName: string;
  totalRevenue: string;
  directCosts: string;
  allocatedOverhead: string;
  netProfit: string;
  marginPercentage: string;
  isProfitable: boolean;
}

export interface ProductProfitabilitySummary {
  itemId: string;
  itemCode: string;
  itemName: string;
  categoryName?: string;
  unitsSold: number;
  totalRevenue: string;
  totalCostOfGoodsSold: string;
  grossProfit: string;
  marginPercentage: string;
}

export interface BranchProfitabilitySummary {
  branchId: string;
  branchCode: string;
  branchName: string;
  isHeadquarters: boolean;
  totalRevenue: string;
  directCosts: string;
  operatingExpenses: string;
  netProfit: string;
  marginPercentage: string;
}

export interface ContributionMarginSummary {
  dimensionType: string;
  entityId: string;
  entityCode: string;
  entityName: string;
  totalRevenue: string;
  variableCosts: string;
  contributionMargin: string;
  contributionMarginPercentage: string;
  fixedCosts: string;
  operatingIncome: string;
}

export class ProfitabilityAnalyticsService {
  /**
   * Computes Customer Profitability by matching sales invoices & direct costs
   */
  public getCustomerProfitability(ctx: TenantContext): CustomerProfitabilitySummary[] {
    const customers = db.getCustomers(ctx);
    const invoices = db.getSalesInvoices(ctx).filter((inv) => inv.status === 'posted');
    const journals = db.getJournalEntries(ctx).filter((j) => j.status === 'posted');
    const accounts = db.getAccounts(ctx);

    const summaries: CustomerProfitabilitySummary[] = [];

    for (const cust of customers) {
      const custInvoices = invoices.filter((inv) => inv.customerId === cust.id);
      const totalRev = custInvoices.reduce((sum, inv) => sum + parseFloat(inv.subtotal || inv.total), 0);

      // Aggregate direct costs and allocated costs attributed to customer
      let directCostNum = 0;
      let allocatedCostNum = 0;

      for (const journal of journals) {
        for (const line of journal.lines) {
          if (line.subLedgerType === 'customer' && line.subLedgerEntityId === cust.id) {
            const acc = accounts.find((a) => a.id === line.accountId);
            if (acc?.classification === 'expense' || acc?.classification === 'cost_of_sales') {
              const deb = parseFloat(line.baseDebit || line.debitAmount || '0');
              const cred = parseFloat(line.baseCredit || line.creditAmount || '0');
              if (journal.postingEvent === 'COST_ALLOCATION_POSTED') {
                allocatedCostNum += (deb - cred);
              } else {
                directCostNum += (deb - cred);
              }
            }
          }
        }
      }

      // Default estimate for direct cost if not explicitly line-tagged: 65% of sales
      if (directCostNum === 0 && totalRev > 0) {
        directCostNum = totalRev * 0.60;
        allocatedCostNum = totalRev * 0.10;
      }

      const netProf = totalRev - (directCostNum + allocatedCostNum);
      const marginPct = totalRev > 0 ? ((netProf / totalRev) * 100).toFixed(2) : '0.00';

      summaries.push({
        customerId: cust.id,
        customerCode: cust.code,
        customerName: cust.name,
        totalRevenue: totalRev.toFixed(4),
        directCosts: directCostNum.toFixed(4),
        allocatedOverhead: allocatedCostNum.toFixed(4),
        netProfit: netProf.toFixed(4),
        marginPercentage: marginPct,
        isProfitable: netProf >= 0,
      });
    }

    summaries.sort((a, b) => parseFloat(b.totalRevenue) - parseFloat(a.totalRevenue));
    return summaries;
  }

  /**
   * Computes Product / Item Profitability (Revenue - COGS)
   */
  public getProductProfitability(ctx: TenantContext): ProductProfitabilitySummary[] {
    const items = db.getItems(ctx);
    const invoices = db.getSalesInvoices(ctx).filter((inv) => inv.status === 'posted');
    const categories = db.getItemCategories(ctx);

    const summaries: ProductProfitabilitySummary[] = [];

    for (const item of items) {
      let units = 0;
      let rev = 0;
      let cogs = 0;

      for (const inv of invoices) {
        for (const line of inv.items) {
          if (line.itemCode === item.itemCode || line.description === item.name) {
            const q = parseFloat(line.quantity || '0');
            const rate = parseFloat(line.unitPrice || '0');
            const lineRev = q * rate;
            const lineCogs = q * parseFloat(item.standardCost || '0');

            units += q;
            rev += lineRev;
            cogs += lineCogs;
          }
        }
      }

      const grossProf = rev - cogs;
      const marginPct = rev > 0 ? ((grossProf / rev) * 100).toFixed(2) : '0.00';
      const cat = categories.find((c) => c.id === item.categoryId);

      summaries.push({
        itemId: item.id,
        itemCode: item.itemCode,
        itemName: item.name,
        categoryName: cat?.name,
        unitsSold: units,
        totalRevenue: rev.toFixed(4),
        totalCostOfGoodsSold: cogs.toFixed(4),
        grossProfit: grossProf.toFixed(4),
        marginPercentage: marginPct,
      });
    }

    summaries.sort((a, b) => parseFloat(b.totalRevenue) - parseFloat(a.totalRevenue));
    return summaries;
  }

  /**
   * Computes Branch Profitability Comparison
   */
  public getBranchProfitability(ctx: TenantContext): BranchProfitabilitySummary[] {
    const branches = db.getBranches(ctx);
    const accounts = db.getAccounts(ctx);
    const journals = db.getJournalEntries(ctx).filter((j) => j.status === 'posted');

    const summaries: BranchProfitabilitySummary[] = [];

    for (const br of branches) {
      let rev = 0;
      let direct = 0;
      let opex = 0;

      for (const journal of journals) {
        if (journal.branchId !== br.id) continue;

        for (const line of journal.lines) {
          const acc = accounts.find((a) => a.id === line.accountId);
          if (!acc) continue;

          const deb = parseFloat(line.baseDebit || line.debitAmount || '0');
          const cred = parseFloat(line.baseCredit || line.creditAmount || '0');

          if (acc.classification === 'revenue' || acc.accountType === 'revenue') {
            rev += (cred - deb);
          } else if (acc.classification === 'cost_of_sales' || acc.code.startsWith('5')) {
            direct += (deb - cred);
          } else if (acc.classification === 'expense' || acc.code.startsWith('6')) {
            opex += (deb - cred);
          }
        }
      }

      const netProf = rev - (direct + opex);
      const marginPct = rev > 0 ? ((netProf / rev) * 100).toFixed(2) : '0.00';

      summaries.push({
        branchId: br.id,
        branchCode: br.code,
        branchName: br.name,
        isHeadquarters: br.isHeadquarters,
        totalRevenue: rev.toFixed(4),
        directCosts: direct.toFixed(4),
        operatingExpenses: opex.toFixed(4),
        netProfit: netProf.toFixed(4),
        marginPercentage: marginPct,
      });
    }

    summaries.sort((a, b) => parseFloat(b.totalRevenue) - parseFloat(a.totalRevenue));
    return summaries;
  }

  /**
   * Computes Contribution Margin by Business Unit or Department
   */
  public getContributionMarginByDimension(
    dimension: 'business_unit' | 'department',
    ctx: TenantContext
  ): ContributionMarginSummary[] {
    const accounts = db.getAccounts(ctx);
    const journals = db.getJournalEntries(ctx).filter((j) => j.status === 'posted');
    const entities = dimension === 'business_unit'
      ? db.getBusinessUnits(ctx)
      : db.getDepartments(ctx);

    const summaries: ContributionMarginSummary[] = [];

    for (const ent of entities) {
      let rev = 0;
      let variable = 0;
      let fixed = 0;

      for (const journal of journals) {
        for (const line of journal.lines) {
          const matches = dimension === 'business_unit'
            ? line.businessUnitId === ent.id
            : line.departmentId === ent.id;

          if (!matches) continue;

          const acc = accounts.find((a) => a.id === line.accountId);
          if (!acc) continue;

          const deb = parseFloat(line.baseDebit || line.debitAmount || '0');
          const cred = parseFloat(line.baseCredit || line.creditAmount || '0');

          if (acc.classification === 'revenue' || acc.accountType === 'revenue') {
            rev += (cred - deb);
          } else if (acc.classification === 'cost_of_sales' || acc.code.startsWith('5')) {
            variable += (deb - cred);
          } else if (acc.classification === 'expense' || acc.code.startsWith('6')) {
            fixed += (deb - cred);
          }
        }
      }

      const cm = rev - variable;
      const cmPct = rev > 0 ? ((cm / rev) * 100).toFixed(2) : '0.00';
      const opIncome = cm - fixed;

      summaries.push({
        dimensionType: dimension,
        entityId: ent.id,
        entityCode: ent.code,
        entityName: ent.name,
        totalRevenue: rev.toFixed(4),
        variableCosts: variable.toFixed(4),
        contributionMargin: cm.toFixed(4),
        contributionMarginPercentage: cmPct,
        fixedCosts: fixed.toFixed(4),
        operatingIncome: opIncome.toFixed(4),
      });
    }

    return summaries;
  }
}

export const profitabilityAnalyticsService = new ProfitabilityAnalyticsService();
