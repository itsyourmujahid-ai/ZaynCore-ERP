// ============================================================================
// General Ledger & Financial Reporting Aggregation Engine
// ============================================================================

import { db } from '@/database/storage';
import { TenantContext } from '@/core/types/common';
import { DbAccount } from '@/database/types';

export interface LedgerTransactionRow {
  journalEntryId: string;
  entryNumber: string;
  postingDate: string;
  sourceModule: string;
  memo: string;
  lineDescription: string;
  debitAmount: string;
  creditAmount: string;
  runningBalance: string;
  currency: string;
  costCenterId?: string;
  departmentId?: string;
  projectId?: string;
}

export interface AccountLedgerReport {
  account: DbAccount;
  currency: string;
  openingBalance: string;
  periodDebit: string;
  periodCredit: string;
  closingBalance: string;
  transactions: LedgerTransactionRow[];
}

export interface TrialBalanceReportRow {
  accountId: string;
  code: string;
  name: string;
  classification: string;
  accountType: string;
  normalBalance: 'debit' | 'credit';
  openingDebit: string;
  openingCredit: string;
  periodDebit: string;
  periodCredit: string;
  closingDebit: string;
  closingCredit: string;
}

export interface TrialBalanceReport {
  rows: TrialBalanceReportRow[];
  totalOpeningDebit: string;
  totalOpeningCredit: string;
  totalPeriodDebit: string;
  totalPeriodCredit: string;
  totalClosingDebit: string;
  totalClosingCredit: string;
  isBalanced: boolean;
}

export class GeneralLedgerService {
  /**
   * Computes detailed transactional movements and running balances for a specific GL account
   */
  public getAccountLedger(
    accountId: string,
    filters?: { startDate?: string; endDate?: string; branchId?: string; costCenterId?: string },
    ctx?: TenantContext
  ): AccountLedgerReport {
    const tenantCtx = ctx || { companyId: 'c1000000-0000-0000-0000-000000000001', baseCurrency: 'USD' } as TenantContext;
    const accounts = db.getAccounts(tenantCtx);
    const account = accounts.find((a) => a.id === accountId);
    if (!account) throw new Error(`Account '${accountId}' not found`);

    const allJournals = db.getJournalEntries(tenantCtx).filter((j) => j.status === 'posted');
    
    // Sort journals chronologically
    allJournals.sort((a, b) => a.postingDate.localeCompare(b.postingDate) || a.entryNumber.localeCompare(b.entryNumber));

    let openingBalanceNum = 0;
    let periodDebitNum = 0;
    let periodCreditNum = 0;
    const transactions: LedgerTransactionRow[] = [];

    const isDebitNormal = account.normalBalance === 'debit';

    for (const journal of allJournals) {
      if (filters?.branchId && journal.branchId !== filters.branchId) continue;

      const matchingLines = journal.lines.filter((l) => l.accountId === accountId);
      for (const line of matchingLines) {
        if (filters?.costCenterId && line.costCenterId !== filters.costCenterId) continue;

        const deb = parseFloat(line.debitAmount);
        const cred = parseFloat(line.creditAmount);

        // Filter by date
        if (filters?.startDate && journal.postingDate < filters.startDate) {
          openingBalanceNum += isDebitNormal ? (deb - cred) : (cred - deb);
        } else if (!filters?.endDate || journal.postingDate <= filters.endDate) {
          periodDebitNum += deb;
          periodCreditNum += cred;

          const movement = isDebitNormal ? (deb - cred) : (cred - deb);
          const currentRunning = (transactions.length === 0 ? openingBalanceNum : parseFloat(transactions[transactions.length - 1].runningBalance)) + movement;

          transactions.push({
            journalEntryId: journal.id,
            entryNumber: journal.entryNumber,
            postingDate: journal.postingDate,
            sourceModule: journal.sourceModule,
            memo: journal.memo,
            lineDescription: line.description,
            debitAmount: line.debitAmount,
            creditAmount: line.creditAmount,
            runningBalance: currentRunning.toFixed(4),
            currency: line.currency,
            costCenterId: line.costCenterId,
            departmentId: line.departmentId,
            projectId: line.projectId,
          });
        }
      }
    }

    const closingBalanceNum = openingBalanceNum + (isDebitNormal ? (periodDebitNum - periodCreditNum) : (periodCreditNum - periodDebitNum));

    return {
      account,
      currency: account.currency || tenantCtx.baseCurrency,
      openingBalance: openingBalanceNum.toFixed(4),
      periodDebit: periodDebitNum.toFixed(4),
      periodCredit: periodCreditNum.toFixed(4),
      closingBalance: closingBalanceNum.toFixed(4),
      transactions,
    };
  }

  /**
   * Generates a balanced Trial Balance across all General Ledger accounts
   */
  public getTrialBalance(
    filters?: { startDate?: string; endDate?: string; periodId?: string },
    ctx?: TenantContext
  ): TrialBalanceReport {
    const tenantCtx = ctx || { companyId: 'c1000000-0000-0000-0000-000000000001', baseCurrency: 'USD' } as TenantContext;
    const accounts = db.getAccounts(tenantCtx);
    const journals = db.getJournalEntries(tenantCtx).filter((j) => j.status === 'posted');

    let totalOpenDeb = 0;
    let totalOpenCred = 0;
    let totalPerDeb = 0;
    let totalPerCred = 0;
    let totalCloseDeb = 0;
    let totalCloseCred = 0;

    const rows: TrialBalanceReportRow[] = accounts.map((acc) => {
      let openDeb = 0;
      let openCred = 0;
      let perDeb = 0;
      let perCred = 0;

      for (const j of journals) {
        if (filters?.periodId && j.periodId !== filters.periodId) continue;

        for (const line of j.lines) {
          if (line.accountId === acc.id) {
            const deb = parseFloat(line.debitAmount);
            const cred = parseFloat(line.creditAmount);

            if (filters?.startDate && j.postingDate < filters.startDate) {
              openDeb += deb;
              openCred += cred;
            } else if (!filters?.endDate || j.postingDate <= filters.endDate) {
              perDeb += deb;
              perCred += cred;
            }
          }
        }
      }

      const netTotalDeb = openDeb + perDeb;
      const netTotalCred = openCred + perCred;
      const netBalance = netTotalDeb - netTotalCred;

      const closingDebit = netBalance > 0 ? netBalance.toFixed(4) : '0.0000';
      const closingCredit = netBalance < 0 ? Math.abs(netBalance).toFixed(4) : '0.0000';

      totalOpenDeb += openDeb;
      totalOpenCred += openCred;
      totalPerDeb += perDeb;
      totalPerCred += perCred;
      totalCloseDeb += parseFloat(closingDebit);
      totalCloseCred += parseFloat(closingCredit);

      return {
        accountId: acc.id,
        code: acc.code,
        name: acc.name,
        classification: acc.classification,
        accountType: acc.accountType || acc.classification,
        normalBalance: acc.normalBalance || 'debit',
        openingDebit: openDeb.toFixed(4),
        openingCredit: openCred.toFixed(4),
        periodDebit: perDeb.toFixed(4),
        periodCredit: perCred.toFixed(4),
        closingDebit,
        closingCredit,
      };
    });

    const isBalanced = Math.abs(totalCloseDeb - totalCloseCred) < 0.0001;

    return {
      rows,
      totalOpeningDebit: totalOpenDeb.toFixed(4),
      totalOpeningCredit: totalOpenCred.toFixed(4),
      totalPeriodDebit: totalPerDeb.toFixed(4),
      totalPeriodCredit: totalPerCred.toFixed(4),
      totalClosingDebit: totalCloseDeb.toFixed(4),
      totalClosingCredit: totalCloseCred.toFixed(4),
      isBalanced,
    };
  }

  /**
   * Computes an Income Statement (Profit & Loss) report
   */
  public getIncomeStatement(
    filters?: { startDate?: string; endDate?: string; branchId?: string },
    ctx?: TenantContext
  ): {
    totalRevenue: string;
    totalCostOfGoodsSold: string;
    grossProfit: string;
    totalOperatingExpenses: string;
    operatingIncome: string;
    netIncome: string;
    revenueRows: Array<{ accountCode: string; accountName: string; amount: string }>;
    cogsRows: Array<{ accountCode: string; accountName: string; amount: string }>;
    expenseRows: Array<{ accountCode: string; accountName: string; amount: string }>;
  } {
    const tenantCtx = ctx || { companyId: 'c1000000-0000-0000-0000-000000000001', baseCurrency: 'USD' } as TenantContext;
    const accounts = db.getAccounts(tenantCtx);
    const journals = db.getJournalEntries(tenantCtx).filter((j) => j.status === 'posted');

    let totalRev = 0;
    let totalCogs = 0;
    let totalExp = 0;

    const revenueRows: Array<{ accountCode: string; accountName: string; amount: string }> = [];
    const cogsRows: Array<{ accountCode: string; accountName: string; amount: string }> = [];
    const expenseRows: Array<{ accountCode: string; accountName: string; amount: string }> = [];

    for (const acc of accounts) {
      if (acc.classification !== 'revenue' && acc.classification !== 'expense' && acc.classification !== 'cost_of_sales') continue;

      let netDeb = 0;
      let netCred = 0;

      for (const j of journals) {
        if (filters?.branchId && j.branchId !== filters.branchId) continue;
        if (filters?.startDate && j.postingDate < filters.startDate) continue;
        if (filters?.endDate && j.postingDate > filters.endDate) continue;

        for (const line of j.lines) {
          if (line.accountId === acc.id) {
            netDeb += parseFloat(line.debitAmount);
            netCred += parseFloat(line.creditAmount);
          }
        }
      }

      if (acc.classification === 'revenue') {
        const revAmount = netCred - netDeb;
        if (Math.abs(revAmount) > 0.0001) {
          totalRev += revAmount;
          revenueRows.push({ accountCode: acc.code, accountName: acc.name, amount: revAmount.toFixed(4) });
        }
      } else if (acc.classification === 'expense' || acc.classification === 'cost_of_sales') {
        const expAmount = netDeb - netCred;
        const isCogs = acc.classification === 'cost_of_sales' || acc.accountType === 'cost_of_sales' || acc.code.startsWith('5') || acc.name.toLowerCase().includes('cost of goods') || acc.name.toLowerCase().includes('cogs');
        if (Math.abs(expAmount) > 0.0001) {
          if (isCogs) {
            totalCogs += expAmount;
            cogsRows.push({ accountCode: acc.code, accountName: acc.name, amount: expAmount.toFixed(4) });
          } else {
            totalExp += expAmount;
            expenseRows.push({ accountCode: acc.code, accountName: acc.name, amount: expAmount.toFixed(4) });
          }
        }
      }
    }

    const grossProfit = totalRev - totalCogs;
    const operatingIncome = grossProfit - totalExp;
    const netIncome = operatingIncome;

    return {
      totalRevenue: totalRev.toFixed(4),
      totalCostOfGoodsSold: totalCogs.toFixed(4),
      grossProfit: grossProfit.toFixed(4),
      totalOperatingExpenses: totalExp.toFixed(4),
      operatingIncome: operatingIncome.toFixed(4),
      netIncome: netIncome.toFixed(4),
      revenueRows,
      cogsRows,
      expenseRows,
    };
  }

  /**
   * Computes a Balance Sheet report with Assets == Liabilities + Equity balance verification
   */
  public getBalanceSheet(
    filters?: { asOfDate?: string; branchId?: string },
    ctx?: TenantContext
  ): {
    totalAssets: string;
    totalLiabilities: string;
    totalEquity: string;
    totalLiabilitiesAndEquity: string;
    currentPeriodNetIncome: string;
    isBalanced: boolean;
    assetRows: Array<{ accountCode: string; accountName: string; amount: string }>;
    liabilityRows: Array<{ accountCode: string; accountName: string; amount: string }>;
    equityRows: Array<{ accountCode: string; accountName: string; amount: string }>;
  } {
    const tenantCtx = ctx || { companyId: 'c1000000-0000-0000-0000-000000000001', baseCurrency: 'USD' } as TenantContext;
    const accounts = db.getAccounts(tenantCtx);
    const journals = db.getJournalEntries(tenantCtx).filter((j) => j.status === 'posted');

    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;

    const assetRows: Array<{ accountCode: string; accountName: string; amount: string }> = [];
    const liabilityRows: Array<{ accountCode: string; accountName: string; amount: string }> = [];
    const equityRows: Array<{ accountCode: string; accountName: string; amount: string }> = [];

    // Calculate current net income from revenue & expense accounts
    const isReport = this.getIncomeStatement({ endDate: filters?.asOfDate, branchId: filters?.branchId }, ctx);
    const currentPeriodNetIncome = parseFloat(isReport.netIncome);

    for (const acc of accounts) {
      if (acc.classification !== 'asset' && acc.classification !== 'liability' && acc.classification !== 'equity') continue;

      let netDeb = 0;
      let netCred = 0;

      for (const j of journals) {
        if (filters?.branchId && j.branchId !== filters.branchId) continue;
        if (filters?.asOfDate && j.postingDate > filters.asOfDate) continue;

        for (const line of j.lines) {
          if (line.accountId === acc.id) {
            netDeb += parseFloat(line.debitAmount);
            netCred += parseFloat(line.creditAmount);
          }
        }
      }

      if (acc.classification === 'asset') {
        const val = netDeb - netCred;
        totalAssets += val;
        assetRows.push({ accountCode: acc.code, accountName: acc.name, amount: val.toFixed(4) });
      } else if (acc.classification === 'liability') {
        const val = netCred - netDeb;
        totalLiabilities += val;
        liabilityRows.push({ accountCode: acc.code, accountName: acc.name, amount: val.toFixed(4) });
      } else if (acc.classification === 'equity') {
        const val = netCred - netDeb;
        totalEquity += val;
        equityRows.push({ accountCode: acc.code, accountName: acc.name, amount: val.toFixed(4) });
      }
    }

    // Add current period net income to equity
    totalEquity += currentPeriodNetIncome;
    equityRows.push({ accountCode: '3999', accountName: 'Current Period Retained Earnings', amount: currentPeriodNetIncome.toFixed(4) });

    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
    const isBalanced = Math.abs(parseFloat(totalAssets.toFixed(4)) - parseFloat(totalLiabilitiesAndEquity.toFixed(4))) < 0.01;

    return {
      totalAssets: totalAssets.toFixed(4),
      totalLiabilities: totalLiabilities.toFixed(4),
      totalEquity: totalEquity.toFixed(4),
      totalLiabilitiesAndEquity: totalLiabilitiesAndEquity.toFixed(4),
      currentPeriodNetIncome: currentPeriodNetIncome.toFixed(4),
      isBalanced,
      assetRows,
      liabilityRows,
      equityRows,
    };
  }
}

export const generalLedgerService = new GeneralLedgerService();
