// ============================================================================
// Advanced Financials & Enterprise Accounting Service
// ============================================================================

import { db } from '@/database/storage';
import { TenantContext } from '@/core/types/common';
import {
  DbYearEndClose,
  DbFxRevaluation,
  DbEclCalculation,
  DbBadDebtWriteOff,
} from '@/database/types';
import { AccountingPostingService } from './accounting-posting.service';
import { GeneralLedgerService } from './general-ledger.service';

export interface YearEndChecklistItem {
  code: string;
  title: string;
  status: 'passed' | 'warning' | 'failed';
  details: string;
}

export interface YearEndPreClosingSummary {
  fiscalYearId: string;
  fiscalYearName: string;
  startDate: string;
  endDate: string;
  checklist: YearEndChecklistItem[];
  canClose: boolean;
  totalRevenue: string;
  totalExpense: string;
  netProfitLoss: string;
  nominalAccountsToClose: {
    accountId: string;
    accountCode: string;
    accountName: string;
    classification: string;
    balance: string;
    closingAction: 'debit' | 'credit';
    closingAmount: string;
  }[];
}

export interface FxRevaluationItem {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  currency: string;
  foreignBalance: string;
  currentBookValueBase: string;
  spotRate: string;
  revaluedValueBase: string;
  unrealizedGainLoss: string; // Positive = Gain, Negative = Loss
}

export class AdvancedFinancialsService {
  private static instance: AdvancedFinancialsService;
  private postingService = AccountingPostingService.getInstance();
  private glService = new GeneralLedgerService();

  public static getInstance(): AdvancedFinancialsService {
    if (!AdvancedFinancialsService.instance) {
      AdvancedFinancialsService.instance = new AdvancedFinancialsService();
    }
    return AdvancedFinancialsService.instance;
  }

  // ==========================================================================
  // 1. YEAR-END CLOSING WORKFLOW & P&L NOMINAL CLOSE
  // ==========================================================================

  public getYearEndPreClosingSummary(fiscalYearId: string, ctx: TenantContext): YearEndPreClosingSummary {
    const fiscalYears = db.getFiscalYears(ctx);
    const fy = fiscalYears.find((f) => f.id === fiscalYearId);
    if (!fy) throw new Error(`Fiscal Year '${fiscalYearId}' not found.`);

    const checklist: YearEndChecklistItem[] = [];

    // 1. Check if already closed
    const isAlreadyClosed = fy.status === 'closed';
    checklist.push({
      code: 'FY_STATUS',
      title: 'Fiscal Year Status Check',
      status: isAlreadyClosed ? 'failed' : 'passed',
      details: isAlreadyClosed ? `Fiscal Year ${fy.name} is already closed.` : `Fiscal Year is open and eligible for closing.`,
    });

    // 2. Draft/Unposted Journals Check
    const journals = db.getJournalEntries(ctx);
    const unpostedJournals = journals.filter(
      (j) => j.status === 'draft' && j.postingDate >= fy.startDate && j.postingDate <= fy.endDate
    );
    checklist.push({
      code: 'UNPOSTED_JOURNALS',
      title: 'Draft / Unposted Journals Check',
      status: unpostedJournals.length === 0 ? 'passed' : 'warning',
      details:
        unpostedJournals.length === 0
          ? 'No unposted draft journals found in the fiscal year.'
          : `Found ${unpostedJournals.length} draft journals that should be posted or discarded before closing.`,
    });

    // 3. Nominal Accounts Balances Calculation
    const accounts = db.getAccounts(ctx);
    const nominalAccountsToClose: YearEndPreClosingSummary['nominalAccountsToClose'] = [];

    let totalRevNum = 0;
    let totalExpNum = 0;

    for (const acc of accounts) {
      if (acc.classification === 'revenue' || acc.classification === 'expense') {
        const ledger = this.glService.getAccountLedger(
          acc.id,
          { startDate: fy.startDate, endDate: fy.endDate },
          ctx
        );
        const balNum = parseFloat(ledger.closingBalance);

        if (Math.abs(balNum) > 0.0001) {
          if (acc.classification === 'revenue') {
            totalRevNum += balNum;
            nominalAccountsToClose.push({
              accountId: acc.id,
              accountCode: acc.code,
              accountName: acc.name,
              classification: acc.classification,
              balance: balNum.toFixed(4),
              closingAction: balNum >= 0 ? 'debit' : 'credit',
              closingAmount: Math.abs(balNum).toFixed(4),
            });
          } else {
            totalExpNum += balNum;
            nominalAccountsToClose.push({
              accountId: acc.id,
              accountCode: acc.code,
              accountName: acc.name,
              classification: acc.classification,
              balance: balNum.toFixed(4),
              closingAction: balNum >= 0 ? 'credit' : 'debit',
              closingAmount: Math.abs(balNum).toFixed(4),
            });
          }
        }
      }
    }

    const netProfitLossNum = totalRevNum - totalExpNum;

    checklist.push({
      code: 'PL_BALANCE_AUDIT',
      title: 'Nominal Accounts Balance Verification',
      status: 'passed',
      details: `Revenues: ${totalRevNum.toFixed(4)}, Expenses: ${totalExpNum.toFixed(4)}, Net Profit/Loss: ${netProfitLossNum.toFixed(4)}`,
    });

    const canClose = !isAlreadyClosed;

    return {
      fiscalYearId: fy.id,
      fiscalYearName: fy.name,
      startDate: fy.startDate,
      endDate: fy.endDate,
      checklist,
      canClose,
      totalRevenue: totalRevNum.toFixed(4),
      totalExpense: totalExpNum.toFixed(4),
      netProfitLoss: netProfitLossNum.toFixed(4),
      nominalAccountsToClose,
    };
  }

  public executeYearEndClose(
    fiscalYearId: string,
    closingDate: string,
    ctx: TenantContext
  ): { yearEndClose: DbYearEndClose; journalEntryId?: string } {
    const summary = this.getYearEndPreClosingSummary(fiscalYearId, ctx);
    if (!summary.canClose) {
      throw new Error(`Cannot close fiscal year ${summary.fiscalYearName}: Pre-closing checklist failed.`);
    }

    const netPL = parseFloat(summary.netProfitLoss);
    let journalEntryId: string | undefined;

    // Retained Earnings Account
    const accounts = db.getAccounts(ctx);
    const retainedEarningsAcc =
      accounts.find((a) => a.code === '3200' || (a as any).type === 'retained_earnings' || a.accountType === 'equity' || a.name.toLowerCase().includes('retained earnings')) ||
      accounts.find((a) => a.classification === 'equity');

    if (!retainedEarningsAcc) {
      throw new Error('Retained Earnings equity account (#3200) not found in Chart of Accounts.');
    }

    // If there are nominal accounts with balances, post formal closing journal
    if (summary.nominalAccountsToClose.length > 0) {
      const customLines: any[] = summary.nominalAccountsToClose.map((item) => ({
        accountId: item.accountId,
        description: `Year-End Close nominal transfer: ${item.accountCode} - ${item.accountName}`,
        debitAmount: item.closingAction === 'debit' ? item.closingAmount : '0.0000',
        creditAmount: item.closingAction === 'credit' ? item.closingAmount : '0.0000',
      }));

      // Add Retained Earnings balancing line
      if (netPL >= 0) {
        // Net Profit -> Credit Retained Earnings
        customLines.push({
          accountId: retainedEarningsAcc.id,
          description: `Transfer of Net Profit for Fiscal Year ${summary.fiscalYearName} to Retained Earnings`,
          debitAmount: '0.0000',
          creditAmount: netPL.toFixed(4),
        });
      } else {
        // Net Loss -> Debit Retained Earnings
        customLines.push({
          accountId: retainedEarningsAcc.id,
          description: `Transfer of Net Loss for Fiscal Year ${summary.fiscalYearName} to Retained Earnings`,
          debitAmount: Math.abs(netPL).toFixed(4),
          creditAmount: '0.0000',
        });
      }

      const journal = this.postingService.post(
        'MANUAL_JOURNAL_POSTED',
        {
          sourceType: 'fiscal_year_close',
          sourceId: fiscalYearId,
          documentNumber: `CLOSE-${summary.fiscalYearName}`,
          documentDate: closingDate,
          memo: `Formal Year-End Nominal Accounts Closing & Net Profit/Loss Transfer for Fiscal Year ${summary.fiscalYearName}`,
          currency: ctx.baseCurrency || 'USD',
          amount: Math.abs(netPL).toFixed(4),
          customLines,
        },
        ctx
      );

      journalEntryId = journal.id;
    }

    // Record Year End Close record
    const yearEndCloseRecord = db.createYearEndClose(
      {
        fiscalYearId,
        fiscalYearName: summary.fiscalYearName,
        closingDate,
        retainedEarningsAccountId: retainedEarningsAcc.id,
        totalRevenueClosed: summary.totalRevenue,
        totalExpenseClosed: summary.totalExpense,
        netIncomeTransferred: summary.netProfitLoss,
        closingJournalEntryId: journalEntryId || '',
        status: 'closed',
        closedBy: ctx.userId || 'system-admin',
        closedAt: new Date().toISOString(),
      },
      ctx
    );

    // Update Fiscal Year status to closed
    const fiscalYears = db.getFiscalYears(ctx);
    const fy = fiscalYears.find((f) => f.id === fiscalYearId);
    if (fy) {
      db.updateFiscalYear(fy.id, { status: 'closed' }, ctx);
    }

    // Lock all periods in this fiscal year
    const periods = db.getAccountingPeriods(ctx).filter((p) => p.fiscalYearId === fiscalYearId);
    for (const p of periods) {
      db.updateAccountingPeriod(p.id, { status: 'locked' }, ctx);
    }

    return { yearEndClose: yearEndCloseRecord, journalEntryId };
  }

  // ==========================================================================
  // 2. PERIOD-END UNREALIZED FX REVALUATION & AUTO-REVERSAL
  // ==========================================================================

  public calculateFxRevaluation(
    asOfDate: string,
    currencyRates: { currency: string; spotRate: string }[],
    ctx: TenantContext
  ): { items: FxRevaluationItem[]; totalUnrealizedGainLoss: string } {
    const rateMap = new Map<string, number>();
    for (const r of currencyRates) {
      rateMap.set(r.currency.toUpperCase(), parseFloat(r.spotRate));
    }

    const accounts = db.getAccounts(ctx);
    const journals = db.getJournalEntries(ctx).filter((j) => j.status === 'posted' && j.postingDate <= asOfDate);

    const items: FxRevaluationItem[] = [];
    let totalGainLossNum = 0;

    for (const acc of accounts) {
      if (acc.currency && acc.currency !== ctx.baseCurrency && rateMap.has(acc.currency.toUpperCase())) {
        const spotRate = rateMap.get(acc.currency.toUpperCase())!;

        let foreignBal = 0;
        let bookBal = 0;

        for (const j of journals) {
          const lines = j.lines.filter((l) => l.accountId === acc.id);
          for (const l of lines) {
            const deb = parseFloat(l.debitAmount || '0');
            const cred = parseFloat(l.creditAmount || '0');
            const baseDeb = parseFloat(l.baseDebit || l.debitAmount || '0');
            const baseCred = parseFloat(l.baseCredit || l.creditAmount || '0');

            if (acc.normalBalance === 'debit') {
              foreignBal += deb - cred;
              bookBal += baseDeb - baseCred;
            } else {
              foreignBal += cred - deb;
              bookBal += baseCred - baseDeb;
            }
          }
        }

        if (Math.abs(foreignBal) > 0.0001) {
          const revaluedValueBase = foreignBal * spotRate;
          const gainLoss = acc.normalBalance === 'debit' ? (revaluedValueBase - bookBal) : (bookBal - revaluedValueBase);

          totalGainLossNum += gainLoss;

          items.push({
            accountId: acc.id,
            accountCode: acc.code,
            accountName: acc.name,
            accountType: (acc as any).type || acc.accountType || acc.classification,
            currency: acc.currency,
            foreignBalance: foreignBal.toFixed(4),
            currentBookValueBase: bookBal.toFixed(4),
            spotRate: spotRate.toFixed(6),
            revaluedValueBase: revaluedValueBase.toFixed(4),
            unrealizedGainLoss: gainLoss.toFixed(4),
          });
        }
      }
    }

    return {
      items,
      totalUnrealizedGainLoss: totalGainLossNum.toFixed(4),
    };
  }

  public postFxRevaluation(
    input: {
      asOfDate: string;
      rates: { currency: string; spotRate: string }[];
      notes?: string;
      autoReverseDate?: string;
    },
    ctx: TenantContext
  ): { fxRevaluation: DbFxRevaluation; journalEntryId?: string; reversalJournalEntryId?: string } {
    const calc = this.calculateFxRevaluation(input.asOfDate, input.rates, ctx);
    const totalGainLoss = parseFloat(calc.totalUnrealizedGainLoss);

    let journalEntryId: string | undefined;

    if (Math.abs(totalGainLoss) > 0.0001 && calc.items.length > 0) {
      const accounts = db.getAccounts(ctx);
      const fxGainLossAcc =
        accounts.find((a) => a.code === '7100' || (a as any).type === 'unrealized_fx_gain_loss' || a.name.toLowerCase().includes('fx')) ||
        accounts.find((a) => a.classification === 'revenue');

      const customLines: any[] = [];

      for (const item of calc.items) {
        const itemGL = parseFloat(item.unrealizedGainLoss);
        if (itemGL > 0) {
          // Gain: Debit asset/liability account, Credit FX Gain
          customLines.push({
            accountId: item.accountId,
            description: `FX Gain mark-to-market revaluation (${item.currency})`,
            debitAmount: itemGL.toFixed(4),
            creditAmount: '0.0000',
          });
        } else {
          // Loss: Debit FX Loss, Credit asset/liability account
          customLines.push({
            accountId: item.accountId,
            description: `FX Loss mark-to-market revaluation (${item.currency})`,
            debitAmount: '0.0000',
            creditAmount: Math.abs(itemGL).toFixed(4),
          });
        }
      }

      if (fxGainLossAcc) {
        if (totalGainLoss > 0) {
          customLines.push({
            accountId: fxGainLossAcc.id,
            description: `Unrealized FX Gain on balance sheet revaluation`,
            debitAmount: '0.0000',
            creditAmount: totalGainLoss.toFixed(4),
          });
        } else {
          customLines.push({
            accountId: fxGainLossAcc.id,
            description: `Unrealized FX Loss on balance sheet revaluation`,
            debitAmount: Math.abs(totalGainLoss).toFixed(4),
            creditAmount: '0.0000',
          });
        }
      }

      const journal = this.postingService.post(
        'MANUAL_JOURNAL_POSTED',
        {
          sourceType: 'fx_revaluation',
          sourceId: `fx-reval-${input.asOfDate}`,
          documentNumber: `FX-REV-${input.asOfDate}`,
          documentDate: input.asOfDate,
          memo: `Period-End Unrealized FX Revaluation as of ${input.asOfDate}`,
          currency: ctx.baseCurrency || 'USD',
          amount: Math.abs(totalGainLoss).toFixed(4),
          customLines,
        },
        ctx
      );

      journalEntryId = journal.id;
    }

    const revalRecord = db.createFxRevaluation(
      {
        revaluationDate: input.asOfDate,
        baseCurrency: ctx.baseCurrency || 'USD',
        totalUnrealizedGainLoss: calc.totalUnrealizedGainLoss,
        journalEntryId,
        autoReversalDate: input.autoReverseDate,
        status: 'posted',
        items: calc.items.map((i) => ({
          accountId: i.accountId,
          accountCode: i.accountCode,
          accountName: i.accountName,
          currency: i.currency,
          foreignBalance: i.foreignBalance,
          currentBookValueBase: i.currentBookValueBase,
          spotRate: i.spotRate,
          revaluedValueBase: i.revaluedValueBase,
          unrealizedGainLoss: i.unrealizedGainLoss,
        })),
      },
      ctx
    );

    return { fxRevaluation: revalRecord, journalEntryId };
  }

  // ==========================================================================
  // 3. IFRS 9 ECL MATRIX & BAD DEBT WRITE-OFF / RECOVERY
  // ==========================================================================

  public calculateEcl(
    asOfDate: string,
    customMatrix?: { bucket: string; ratePct: number }[],
    ctx?: TenantContext
  ): {
    buckets: { bucket: string; label: string; grossArAmount: string; lossRatePct: number; expectedLossAmount: string }[];
    totalGrossAr: string;
    totalRequiredProvision: string;
    currentExistingProvision: string;
    incrementalAdjustment: string;
    adjustmentAction: 'increase' | 'decrease' | 'none';
  } {
    const tenantCtx = ctx || ({ companyId: 'c1000000-0000-0000-0000-000000000001', baseCurrency: 'USD' } as TenantContext);

    const defaultMatrix = [
      { bucket: 'current', label: 'Current (0-30 Days)', defaultRate: 1.0 },
      { bucket: '31-60', label: '31 - 60 Days Overdue', defaultRate: 3.5 },
      { bucket: '61-90', label: '61 - 90 Days Overdue', defaultRate: 8.0 },
      { bucket: '91-120', label: '91 - 120 Days Overdue', defaultRate: 20.0 },
      { bucket: '120+', label: '120+ Days Overdue', defaultRate: 50.0 },
    ];

    const invoices = db.getSalesInvoices(tenantCtx).filter((i) => i.status === 'posted');
    const asOfTime = new Date(asOfDate).getTime();

    const bucketAmounts: Record<string, number> = {
      current: 0,
      '31-60': 0,
      '61-90': 0,
      '91-120': 0,
      '120+': 0,
    };

    for (const inv of invoices) {
      const balanceDue = parseFloat(inv.balanceDue || inv.total || '0.0000');
      if (balanceDue <= 0.0001) continue;

      const dueDate = new Date(inv.dueDate || inv.invoiceDate).getTime();
      const diffDays = Math.floor((asOfTime - dueDate) / (1000 * 60 * 60 * 24));

      if (diffDays <= 30) {
        bucketAmounts['current'] += balanceDue;
      } else if (diffDays <= 60) {
        bucketAmounts['31-60'] += balanceDue;
      } else if (diffDays <= 90) {
        bucketAmounts['61-90'] += balanceDue;
      } else if (diffDays <= 120) {
        bucketAmounts['91-120'] += balanceDue;
      } else {
        bucketAmounts['120+'] += balanceDue;
      }
    }

    let totalGrossAr = 0;
    let totalReqProv = 0;

    const buckets = defaultMatrix.map((m) => {
      const custom = customMatrix?.find((c) => c.bucket === m.bucket);
      const ratePct = custom ? custom.ratePct : m.defaultRate;
      const grossAmt = bucketAmounts[m.bucket] || 0;
      const eclAmt = (grossAmt * ratePct) / 100;

      totalGrossAr += grossAmt;
      totalReqProv += eclAmt;

      return {
        bucket: m.bucket,
        label: m.label,
        grossArAmount: grossAmt.toFixed(4),
        lossRatePct: ratePct,
        expectedLossAmount: eclAmt.toFixed(4),
      };
    });

    const accounts = db.getAccounts(tenantCtx);
    const allowanceAcc = accounts.find((a) => a.code === '1210' || a.name.toLowerCase().includes('doubtful') || a.name.toLowerCase().includes('allowance'));
    let currentExistingProv = 0;

    if (allowanceAcc) {
      const ledger = this.glService.getAccountLedger(allowanceAcc.id, { endDate: asOfDate }, tenantCtx);
      currentExistingProv = Math.abs(parseFloat(ledger.closingBalance));
    }

    const diff = totalReqProv - currentExistingProv;
    let action: 'increase' | 'decrease' | 'none' = 'none';
    if (diff > 0.001) action = 'increase';
    else if (diff < -0.001) action = 'decrease';

    return {
      buckets,
      totalGrossAr: totalGrossAr.toFixed(4),
      totalRequiredProvision: totalReqProv.toFixed(4),
      currentExistingProvision: currentExistingProv.toFixed(4),
      incrementalAdjustment: Math.abs(diff).toFixed(4),
      adjustmentAction: action,
    };
  }

  public postEclProvision(
    input: { asOfDate: string; customMatrix?: { bucket: string; ratePct: number }[]; notes?: string },
    ctx: TenantContext
  ): { eclCalculation: DbEclCalculation; journalEntryId?: string } {
    const calc = this.calculateEcl(input.asOfDate, input.customMatrix, ctx);
    const adjAmount = parseFloat(calc.incrementalAdjustment);

    let journalEntryId: string | undefined;

    if (calc.adjustmentAction !== 'none' && adjAmount > 0.0001) {
      const accounts = db.getAccounts(ctx);
      const badDebtExpAcc = accounts.find((a) => a.code === '6400' || (a as any).type === 'bad_debt_expense') || accounts.find((a) => a.classification === 'expense')!;
      const allowanceAcc = accounts.find((a) => a.code === '1210' || (a as any).type === 'allowance_doubtful_accounts') || accounts.find((a) => a.code === '1200')!;

      const customLines = [
        {
          accountId: badDebtExpAcc.id,
          description: `IFRS 9 ECL Provision Adjustment: Bad Debt Expense`,
          debitAmount: calc.adjustmentAction === 'increase' ? calc.incrementalAdjustment : '0.0000',
          creditAmount: calc.adjustmentAction === 'decrease' ? calc.incrementalAdjustment : '0.0000',
        },
        {
          accountId: allowanceAcc.id,
          description: `IFRS 9 ECL Allowance for Doubtful Accounts`,
          debitAmount: calc.adjustmentAction === 'decrease' ? calc.incrementalAdjustment : '0.0000',
          creditAmount: calc.adjustmentAction === 'increase' ? calc.incrementalAdjustment : '0.0000',
        },
      ];

      const journal = this.postingService.post(
        'MANUAL_JOURNAL_POSTED',
        {
          sourceType: 'ecl_provision',
          sourceId: `ecl-${input.asOfDate}`,
          documentNumber: `ECL-${input.asOfDate}`,
          documentDate: input.asOfDate,
          memo: `IFRS 9 Expected Credit Loss Provision Adjustment (${calc.adjustmentAction.toUpperCase()}) as of ${input.asOfDate}`,
          currency: ctx.baseCurrency || 'USD',
          amount: calc.incrementalAdjustment,
          customLines,
        },
        ctx
      );

      journalEntryId = journal.id;
    }

    const record = db.createEclCalculation(
      {
        calculationDate: input.asOfDate,
        totalGrossReceivables: calc.totalGrossAr,
        totalEclProvision: calc.totalRequiredProvision,
        currentAllowanceBalance: calc.currentExistingProvision,
        incrementalAdjustment: calc.incrementalAdjustment,
        adjustmentAction: calc.adjustmentAction,
        journalEntryId,
        status: 'posted',
        buckets: calc.buckets,
      },
      ctx
    );

    return { eclCalculation: record, journalEntryId };
  }

  public submitBadDebtWriteOff(
    input: {
      customerId: string;
      customerName: string;
      invoiceId?: string;
      invoiceNumber?: string;
      amount: string;
      writeOffDate: string;
      reason: string;
      writeOffType: 'allowance' | 'direct';
    },
    ctx: TenantContext
  ): DbBadDebtWriteOff {
    return db.createBadDebtWriteOff(
      {
        ...input,
        status: 'submitted',
      },
      ctx
    );
  }

  public approveAndPostBadDebtWriteOff(
    writeOffId: string,
    ctx: TenantContext
  ): { writeOff: DbBadDebtWriteOff; journalEntryId: string } {
    const writeOffs = db.getBadDebtWriteOffs(ctx);
    const wo = writeOffs.find((w) => w.id === writeOffId);
    if (!wo) throw new Error(`Bad Debt Write-off '${writeOffId}' not found.`);
    if (wo.status === 'posted') throw new Error(`Bad Debt Write-off is already posted.`);

    const accounts = db.getAccounts(ctx);
    const arAcc = accounts.find((a) => a.code === '1200' || (a as any).type === 'accounts_receivable')!;
    const debitAcc =
      wo.writeOffType === 'allowance'
        ? accounts.find((a) => a.code === '1210' || (a as any).type === 'allowance_doubtful_accounts') || arAcc
        : accounts.find((a) => a.code === '6400' || (a as any).type === 'bad_debt_expense') || accounts.find((a) => a.classification === 'expense')!;

    const customLines = [
      {
        accountId: debitAcc.id,
        description: `Write-off of uncollectible customer balance: ${wo.customerName}`,
        debitAmount: wo.amount,
        creditAmount: '0.0000',
      },
      {
        accountId: arAcc.id,
        description: `Extinguishment of Accounts Receivable for ${wo.customerName}`,
        debitAmount: '0.0000',
        creditAmount: wo.amount,
      },
    ];

    const journal = this.postingService.post(
      'MANUAL_JOURNAL_POSTED',
      {
        sourceType: 'bad_debt_writeoff',
        sourceId: wo.id,
        documentNumber: `WO-${wo.invoiceNumber || wo.id.slice(0, 6)}`,
        documentDate: wo.writeOffDate || new Date().toISOString().split('T')[0],
        memo: `Bad Debt Write-off for ${wo.customerName} (${wo.invoiceNumber || 'Account Balance'}) - Reason: ${wo.reason}`,
        currency: ctx.baseCurrency || 'USD',
        amount: wo.amount,
        customLines,
      },
      ctx
    );

    const updated = db.updateBadDebtWriteOff(
      wo.id,
      {
        status: 'posted',
        approvedByUserId: ctx.userId || 'admin',
        journalEntryId: journal.id,
      },
      ctx
    )!;

    if (wo.invoiceId) {
      const inv = db.getSalesInvoices(ctx).find((i) => i.id === wo.invoiceId);
      if (inv) {
        db.updateSalesInvoice(inv.id, { balanceDue: '0.00' }, ctx);
      }
    }

    return { writeOff: updated, journalEntryId: journal.id };
  }

  public recordBadDebtRecovery(
    input: {
      writeOffId: string;
      recoveryAmount: string;
      recoveryDate: string;
      bankAccountId: string;
      notes?: string;
    },
    ctx: TenantContext
  ): { writeOff: DbBadDebtWriteOff; journalEntryId: string } {
    const writeOffs = db.getBadDebtWriteOffs(ctx);
    const wo = writeOffs.find((w) => w.id === input.writeOffId);
    if (!wo) throw new Error(`Bad Debt Write-off '${input.writeOffId}' not found.`);

    const accounts = db.getAccounts(ctx);
    const recoveryIncomeAcc =
      accounts.find((a) => a.code === '7200' || (a as any).type === 'other_income' || a.name.toLowerCase().includes('recovery')) ||
      accounts.find((a) => a.classification === 'revenue')!;

    const customLines = [
      {
        accountId: input.bankAccountId,
        description: `Recovery cash deposit from previously written-off debtor: ${wo.customerName}`,
        debitAmount: input.recoveryAmount,
        creditAmount: '0.0000',
      },
      {
        accountId: recoveryIncomeAcc.id,
        description: `Bad Debt Recovery Income`,
        debitAmount: '0.0000',
        creditAmount: input.recoveryAmount,
      },
    ];

    const journal = this.postingService.post(
      'MANUAL_JOURNAL_POSTED',
      {
        sourceType: 'bad_debt_recovery',
        sourceId: wo.id,
        documentNumber: `REC-${wo.id.slice(0, 6)}`,
        documentDate: input.recoveryDate,
        memo: `Recovery of previously written-off debt from ${wo.customerName} - ${input.notes || ''}`,
        currency: ctx.baseCurrency || 'USD',
        amount: input.recoveryAmount,
        customLines,
      },
      ctx
    );

    const updated = db.updateBadDebtWriteOff(
      wo.id,
      {
        recoveryDate: input.recoveryDate,
        recoveryAmount: input.recoveryAmount,
        recoveryJournalEntryId: journal.id,
      },
      ctx
    )!;

    return { writeOff: updated, journalEntryId: journal.id };
  }

  // ==========================================================================
  // 4. SUSPENSE & CLEARING ACCOUNTS HEALTH MONITOR
  // ==========================================================================

  public getClearingAccountsSummary(ctx: TenantContext): {
    accounts: {
      id: string;
      code: string;
      name: string;
      category: string;
      balance: string;
      transactionCount: number;
      isClean: boolean;
      status: 'healthy' | 'action_required';
    }[];
    totalUnclearedBalance: string;
    actionRequiredCount: number;
  } {
    const accounts = db.getAccounts(ctx);
    const clearingCodes = ['1090', '2120', '2220', '9999'];

    const targetAccounts = accounts.filter(
      (a) =>
        clearingCodes.includes(a.code) ||
        a.name.toLowerCase().includes('clearing') ||
        a.name.toLowerCase().includes('suspense') ||
        a.name.toLowerCase().includes('grni')
    );

    const resultAccounts: any[] = [];
    let totalUncleared = 0;
    let actionReq = 0;

    for (const acc of targetAccounts) {
      const ledger = this.glService.getAccountLedger(acc.id, {}, ctx);
      const balNum = parseFloat(ledger.closingBalance);
      const isClean = Math.abs(balNum) < 0.001;

      totalUncleared += Math.abs(balNum);
      if (!isClean) actionReq++;

      resultAccounts.push({
        id: acc.id,
        code: acc.code,
        name: acc.name,
        category: (acc as any).type || acc.accountType || acc.classification,
        balance: balNum.toFixed(4),
        transactionCount: ledger.transactions.length,
        isClean,
        status: isClean ? 'healthy' : 'action_required',
      });
    }

    return {
      accounts: resultAccounts,
      totalUnclearedBalance: totalUncleared.toFixed(4),
      actionRequiredCount: actionReq,
    };
  }
}
