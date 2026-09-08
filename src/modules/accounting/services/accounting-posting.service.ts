// ============================================================================
// Automatic Accounting Posting Service & Deterministic Rule Engine
// ============================================================================

import { db } from '@/database/storage';
import { TenantContext, PostingEvent, Money, SubLedgerType } from '@/core/types/common';
import { DbJournalEntry, DbJournalLine } from '@/database/types';
import { areDebitsAndCreditsBalanced, createMoney } from '@/core/utils/money';
import { PeriodClosedError } from '@/core/errors/DomainErrors';

export interface OperationalPostingPayload {
  branchId?: string;
  sourceType: string;
  sourceId: string;
  documentNumber: string;
  documentDate: string;
  memo: string;
  currency: string;
  exchangeRate?: string;
  amount: string;
  taxAmount?: string;
  taxCodeId?: string;
  debitAccountId?: string;
  creditAccountId?: string;
  subLedgerType?: SubLedgerType;
  subLedgerEntityId?: string;
  departmentId?: string;
  costCenterId?: string;
  businessUnitId?: string;
  projectId?: string;
  dimensions?: Record<string, string>;
  customLines?: Array<{
    accountCode?: string;
    accountId?: string;
    description: string;
    debitAmount: string;
    creditAmount: string;
    branchId?: string;
    departmentId?: string;
    costCenterId?: string;
    businessUnitId?: string;
    projectId?: string;
    subLedgerType?: SubLedgerType;
    subLedgerEntityId?: string;
    dimensions?: Record<string, string>;
  }>;
  entries?: any[];
}

export interface PostingPreviewResult {
  isBalanced: boolean;
  totalDebit: Money;
  totalCredit: Money;
  lines: Array<{
    accountCode: string;
    accountName: string;
    description: string;
    debitAmount: string;
    creditAmount: string;
  }>;
}

export class AccountingPostingService {
  private static instance: AccountingPostingService;

  public static getInstance(): AccountingPostingService {
    if (!AccountingPostingService.instance) {
      AccountingPostingService.instance = new AccountingPostingService();
    }
    return AccountingPostingService.instance;
  }

  /**
   * Previews a double-entry journal without committing to General Ledger
   */
  public preview(
    event: PostingEvent, 
    payload: OperationalPostingPayload, 
    ctx: TenantContext
  ): PostingPreviewResult {
    const lines = this.resolveJournalLines(event, payload, ctx);
    const accounts = db.getAccounts(ctx);

    const totalDebit = lines.reduce((sum, l) => sum + parseFloat(l.debitAmount), 0);
    const totalCredit = lines.reduce((sum, l) => sum + parseFloat(l.creditAmount), 0);

    const debitMoney = createMoney(totalDebit.toFixed(4), payload.currency || ctx.baseCurrency);
    const creditMoney = createMoney(totalCredit.toFixed(4), payload.currency || ctx.baseCurrency);

    return {
      isBalanced: areDebitsAndCreditsBalanced(debitMoney, creditMoney),
      totalDebit: debitMoney,
      totalCredit: creditMoney,
      lines: lines.map((l) => {
        const acc = accounts.find((a) => a.id === l.accountId);
        return {
          accountCode: acc ? acc.code : 'UNKNOWN',
          accountName: acc ? acc.name : 'Unknown Account',
          description: l.description,
          debitAmount: l.debitAmount,
          creditAmount: l.creditAmount,
        };
      }),
    };
  }

  /**
   * Commits an operational ERP event to General Ledger and Sub-Ledgers
   */
  public post(
    event: PostingEvent, 
    payload: OperationalPostingPayload, 
    ctx: TenantContext
  ): DbJournalEntry {
    let periods = db.getAccountingPeriods(ctx);
    if (periods.length === 0) {
      const months = [
        { name: 'January 2026', start: '2026-01-01', end: '2026-01-31' },
        { name: 'February 2026', start: '2026-02-01', end: '2026-02-28' },
        { name: 'March 2026', start: '2026-03-01', end: '2026-03-31' },
        { name: 'April 2026', start: '2026-04-01', end: '2026-04-30' },
        { name: 'May 2026', start: '2026-05-01', end: '2026-05-31' },
        { name: 'June 2026', start: '2026-06-01', end: '2026-06-30' },
        { name: 'July 2026', start: '2026-07-01', end: '2026-07-31' },
        { name: 'August 2026', start: '2026-08-01', end: '2026-08-31' },
        { name: 'September 2026', start: '2026-09-01', end: '2026-09-30' },
        { name: 'October 2026', start: '2026-10-01', end: '2026-10-31' },
        { name: 'November 2026', start: '2026-11-01', end: '2026-11-30' },
        { name: 'December 2026', start: '2026-12-01', end: '2026-12-31' },
      ];
      months.forEach((m, idx) => {
        db.createAccountingPeriod({
          fiscalYearId: 'fy-2026',
          periodNumber: idx + 1,
          name: m.name,
          startDate: m.start,
          endDate: m.end,
          status: 'open',
        }, ctx);
      });
      periods = db.getAccountingPeriods(ctx);
    }
    const targetPeriod = periods.find(
      (p) => payload.documentDate >= p.startDate && payload.documentDate <= p.endDate
    );

    if (!targetPeriod) {
      throw new Error(`No accounting period found for date ${payload.documentDate}`);
    }

    if (targetPeriod.status !== 'open') {
      throw new PeriodClosedError(targetPeriod.name, targetPeriod.status);
    }

    const lines = this.resolveJournalLines(event, payload, ctx);
    const totalDebit = lines.reduce((sum, l) => sum + parseFloat(l.debitAmount), 0).toFixed(4);
    const totalCredit = lines.reduce((sum, l) => sum + parseFloat(l.creditAmount), 0).toFixed(4);

    return db.postJournalEntry({
      companyId: ctx.companyId,
      branchId: payload.branchId || ctx.branchId,
      periodId: targetPeriod.id,
      entryNumber: `JV-${event.split('_')[0]}-${Math.floor(1000 + Math.random() * 9000)}`,
      entryDate: payload.documentDate,
      postingDate: payload.documentDate,
      status: 'posted',
      sourceModule: event.toLowerCase(),
      sourceType: payload.sourceType,
      sourceId: payload.sourceId,
      postingEvent: event,
      memo: payload.memo || `Automated post for ${payload.documentNumber}`,
      totalDebit,
      totalCredit,
      currency: payload.currency || ctx.baseCurrency,
      exchangeRate: payload.exchangeRate || '1.000000',
      lines,
    }, ctx);
  }

  /**
   * Reverses an existing operational transaction by source reference
   */
  public reverse(
    sourceType: string, 
    sourceId: string, 
    reason: string, 
    ctx: TenantContext
  ): DbJournalEntry {
    const allJournals = db.getJournalEntries(ctx);
    const original = allJournals.find((j) => j.sourceType === sourceType && j.sourceId === sourceId && j.status === 'posted');
    
    if (!original) {
      throw new Error(`Posted journal entry not found for source ${sourceType}:${sourceId}`);
    }

    return db.reverseJournalEntry(original.id, reason, ctx);
  }

  /**
   * Deterministically resolves double-entry lines based on posting event and rules
   */
  private resolveJournalLines(
    event: PostingEvent, 
    payload: OperationalPostingPayload, 
    ctx: TenantContext
  ): Omit<DbJournalLine, 'id' | 'journalEntryId' | 'companyId'>[] {
    const accounts = db.getAccounts(ctx);
    const rate = parseFloat(payload.exchangeRate || '1.000000');

    // If custom balanced lines are passed directly
    if (payload.customLines && payload.customLines.length >= 2) {
      return payload.customLines.map((l, idx) => {
        const acc = l.accountId
          ? accounts.find((a) => a.id === l.accountId)
          : accounts.find((a) => a.code === l.accountCode) || accounts[0];
        const baseDeb = (parseFloat(l.debitAmount) * rate).toFixed(4);
        const baseCred = (parseFloat(l.creditAmount) * rate).toFixed(4);
        return {
          accountId: acc ? acc.id : accounts[0].id,
          lineNumber: idx + 1,
          description: l.description,
          debitAmount: parseFloat(l.debitAmount).toFixed(4),
          creditAmount: parseFloat(l.creditAmount).toFixed(4),
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: baseDeb,
          baseCredit: baseCred,
          branchId: l.branchId || payload.branchId,
          departmentId: l.departmentId || payload.departmentId,
          costCenterId: l.costCenterId || payload.costCenterId,
          businessUnitId: l.businessUnitId || payload.businessUnitId,
          projectId: l.projectId || payload.projectId,
          subLedgerType: l.subLedgerType,
          subLedgerEntityId: l.subLedgerEntityId || (l.subLedgerType ? payload.subLedgerEntityId : undefined),
          dimensions: l.dimensions || payload.dimensions,
        };
      });
    }

    // Deterministic Rule Mapping
    const lines: Omit<DbJournalLine, 'id' | 'journalEntryId' | 'companyId'>[] = [];
    const amountVal = parseFloat(payload.amount);
    const taxVal = parseFloat(payload.taxAmount || '0.0000');
    const netVal = amountVal - taxVal;

    switch (event) {
      case 'SALES_INVOICE_POSTED': {
        // Line 1: Debit Trade Receivables Control (#1200) for gross amount
        const arAcc = accounts.find((a) => a.code === '1200') || accounts[0];
        lines.push({
          accountId: arAcc.id,
          lineNumber: 1,
          description: `Debit AR: ${payload.documentNumber}`,
          debitAmount: amountVal.toFixed(4),
          creditAmount: '0.0000',
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: (amountVal * rate).toFixed(4),
          baseCredit: '0.0000',
          subLedgerType: 'customer',
          subLedgerEntityId: payload.subLedgerEntityId,
          departmentId: payload.departmentId,
          costCenterId: payload.costCenterId,
          projectId: payload.projectId,
        });

        // Line 2: Credit Sales Revenue (#4010) for net amount
        const revAcc = accounts.find((a) => a.code === '4010') || accounts[0];
        lines.push({
          accountId: revAcc.id,
          lineNumber: 2,
          description: `Credit Sales: ${payload.documentNumber}`,
          debitAmount: '0.0000',
          creditAmount: netVal.toFixed(4),
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: '0.0000',
          baseCredit: (netVal * rate).toFixed(4),
          departmentId: payload.departmentId,
          costCenterId: payload.costCenterId,
          projectId: payload.projectId,
        });

        // Line 3: Credit Output Tax / VAT (#2200) if tax is present
        if (taxVal > 0) {
          const vatAcc = accounts.find((a) => a.code === '2200') || accounts[0];
          lines.push({
            accountId: vatAcc.id,
            lineNumber: 3,
            description: `Output VAT: ${payload.documentNumber}`,
            debitAmount: '0.0000',
            creditAmount: taxVal.toFixed(4),
            currency: payload.currency || ctx.baseCurrency,
            exchangeRate: payload.exchangeRate || '1.000000',
            baseDebit: '0.0000',
            baseCredit: (taxVal * rate).toFixed(4),
            taxCodeId: payload.taxCodeId,
            taxAmount: taxVal.toFixed(4),
            subLedgerType: 'tax_code',
            subLedgerEntityId: payload.taxCodeId || 'VAT-STD',
          });
        }
        break;
      }

      case 'SALES_PAYMENT_RECEIVED': {
        // Line 1: Debit Operating Bank Account (#1010)
        const bankAcc = accounts.find((a) => a.code === '1010') || accounts[0];
        lines.push({
          accountId: bankAcc.id,
          lineNumber: 1,
          description: `Customer Receipt: ${payload.documentNumber}`,
          debitAmount: amountVal.toFixed(4),
          creditAmount: '0.0000',
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: (amountVal * rate).toFixed(4),
          baseCredit: '0.0000',
          subLedgerType: 'bank_account',
          subLedgerEntityId: bankAcc.id,
        });

        // Line 2: Credit Trade Receivables Control (#1200)
        const arAcc = accounts.find((a) => a.code === '1200') || accounts[0];
        lines.push({
          accountId: arAcc.id,
          lineNumber: 2,
          description: `Settle AR: ${payload.documentNumber}`,
          debitAmount: '0.0000',
          creditAmount: amountVal.toFixed(4),
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: '0.0000',
          baseCredit: (amountVal * rate).toFixed(4),
          subLedgerType: 'customer',
          subLedgerEntityId: payload.subLedgerEntityId,
        });
        break;
      }

      case 'SALES_CREDIT_NOTE_POSTED': {
        // Line 1: Debit Sales Revenue (#4010) for net amount
        const revAcc = accounts.find((a) => a.code === '4010') || accounts[0];
        lines.push({
          accountId: revAcc.id,
          lineNumber: 1,
          description: `Credit Note Adjustment: ${payload.documentNumber}`,
          debitAmount: netVal.toFixed(4),
          creditAmount: '0.0000',
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: (netVal * rate).toFixed(4),
          baseCredit: '0.0000',
          departmentId: payload.departmentId,
          costCenterId: payload.costCenterId,
        });

        // Line 2: Debit Output VAT (#2200) if tax present
        if (taxVal > 0) {
          const vatAcc = accounts.find((a) => a.code === '2200') || accounts[0];
          lines.push({
            accountId: vatAcc.id,
            lineNumber: 2,
            description: `Output VAT Reversal: ${payload.documentNumber}`,
            debitAmount: taxVal.toFixed(4),
            creditAmount: '0.0000',
            currency: payload.currency || ctx.baseCurrency,
            exchangeRate: payload.exchangeRate || '1.000000',
            baseDebit: (taxVal * rate).toFixed(4),
            baseCredit: '0.0000',
            taxCodeId: payload.taxCodeId,
            taxAmount: taxVal.toFixed(4),
            subLedgerType: 'tax_code',
            subLedgerEntityId: payload.taxCodeId || 'VAT-STD',
          });
        }

        // Line 3: Credit Trade Receivables (#1200) for gross amount
        const arAcc = accounts.find((a) => a.code === '1200') || accounts[0];
        lines.push({
          accountId: arAcc.id,
          lineNumber: lines.length + 1,
          description: `Credit AR: ${payload.documentNumber}`,
          debitAmount: '0.0000',
          creditAmount: amountVal.toFixed(4),
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: '0.0000',
          baseCredit: (amountVal * rate).toFixed(4),
          subLedgerType: 'customer',
          subLedgerEntityId: payload.subLedgerEntityId,
        });
        break;
      }

      case 'PURCHASE_BILL_POSTED': {
        // Line 1: Debit Cost/Expense (#5010) for net amount
        const expAcc = accounts.find((a) => a.code === '5010') || accounts[0];
        lines.push({
          accountId: expAcc.id,
          lineNumber: 1,
          description: `Debit Purchases/COGS: ${payload.documentNumber}`,
          debitAmount: netVal.toFixed(4),
          creditAmount: '0.0000',
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: (netVal * rate).toFixed(4),
          baseCredit: '0.0000',
          departmentId: payload.departmentId,
          costCenterId: payload.costCenterId,
        });

        // Line 2: Debit Input Tax Recoverable (#1450) if tax present
        if (taxVal > 0) {
          const inputTaxAcc = accounts.find((a) => a.code === '1450') || accounts[0];
          lines.push({
            accountId: inputTaxAcc.id,
            lineNumber: 2,
            description: `Input VAT Recoverable: ${payload.documentNumber}`,
            debitAmount: taxVal.toFixed(4),
            creditAmount: '0.0000',
            currency: payload.currency || ctx.baseCurrency,
            exchangeRate: payload.exchangeRate || '1.000000',
            baseDebit: (taxVal * rate).toFixed(4),
            baseCredit: '0.0000',
            taxCodeId: payload.taxCodeId,
            taxAmount: taxVal.toFixed(4),
          });
        }

        // Line 3: Credit Accounts Payable Control (#2010) for gross
        const apAcc = accounts.find((a) => a.code === '2010') || accounts[0];
        lines.push({
          accountId: apAcc.id,
          lineNumber: lines.length + 1,
          description: `Credit AP: ${payload.documentNumber}`,
          debitAmount: '0.0000',
          creditAmount: amountVal.toFixed(4),
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: '0.0000',
          baseCredit: (amountVal * rate).toFixed(4),
          subLedgerType: 'supplier',
          subLedgerEntityId: payload.subLedgerEntityId,
        });
        break;
      }

      case 'PURCHASE_PAYMENT_DISBURSED': {
        // Line 1: Debit Accounts Payable Control (#2010)
        const apAcc = accounts.find((a) => a.code === '2010') || accounts[0];
        lines.push({
          accountId: apAcc.id,
          lineNumber: 1,
          description: `Supplier Payment: ${payload.documentNumber}`,
          debitAmount: amountVal.toFixed(4),
          creditAmount: '0.0000',
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: (amountVal * rate).toFixed(4),
          baseCredit: '0.0000',
          subLedgerType: 'supplier',
          subLedgerEntityId: payload.subLedgerEntityId,
        });

        // Line 2: Credit Operating Bank Account (#1010)
        const bankAcc = accounts.find((a) => a.code === '1010') || accounts[0];
        lines.push({
          accountId: bankAcc.id,
          lineNumber: 2,
          description: `Disbursement from Bank: ${payload.documentNumber}`,
          debitAmount: '0.0000',
          creditAmount: amountVal.toFixed(4),
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: '0.0000',
          baseCredit: (amountVal * rate).toFixed(4),
          subLedgerType: 'bank_account',
          subLedgerEntityId: bankAcc.id,
        });
        break;
      }

      case 'PURCHASE_DEBIT_NOTE_POSTED': {
        // Line 1: Debit Accounts Payable Control (#2010) for gross
        const apAcc = accounts.find((a) => a.code === '2010') || accounts[0];
        lines.push({
          accountId: apAcc.id,
          lineNumber: 1,
          description: `Debit Note AP Reversal: ${payload.documentNumber}`,
          debitAmount: amountVal.toFixed(4),
          creditAmount: '0.0000',
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: (amountVal * rate).toFixed(4),
          baseCredit: '0.0000',
          subLedgerType: 'supplier',
          subLedgerEntityId: payload.subLedgerEntityId,
        });

        // Line 2: Credit Purchases / Expense (#5010) for net
        const expAcc = accounts.find((a) => a.code === '5010') || accounts[0];
        lines.push({
          accountId: expAcc.id,
          lineNumber: 2,
          description: `Purchase Return/Reduction: ${payload.documentNumber}`,
          debitAmount: '0.0000',
          creditAmount: netVal.toFixed(4),
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: '0.0000',
          baseCredit: (netVal * rate).toFixed(4),
          departmentId: payload.departmentId,
          costCenterId: payload.costCenterId,
        });

        // Line 3: Credit Input Tax (#1450) if tax present
        if (taxVal > 0) {
          const inputTaxAcc = accounts.find((a) => a.code === '1450') || accounts[0];
          lines.push({
            accountId: inputTaxAcc.id,
            lineNumber: 3,
            description: `Input VAT Adjustment: ${payload.documentNumber}`,
            debitAmount: '0.0000',
            creditAmount: taxVal.toFixed(4),
            currency: payload.currency || ctx.baseCurrency,
            exchangeRate: payload.exchangeRate || '1.000000',
            baseDebit: '0.0000',
            baseCredit: (taxVal * rate).toFixed(4),
            taxCodeId: payload.taxCodeId,
            taxAmount: taxVal.toFixed(4),
          });
        }
        break;
      }

      case 'INVENTORY_RECEIPT_POSTED': {
        // Line 1: Debit Merchandise Inventory Asset (#1300)
        const invAcc = accounts.find((a) => a.code === '1300') || accounts[0];
        lines.push({
          accountId: invAcc.id,
          lineNumber: 1,
          description: `Inventory Inward Valuation: ${payload.documentNumber}`,
          debitAmount: amountVal.toFixed(4),
          creditAmount: '0.0000',
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: (amountVal * rate).toFixed(4),
          baseCredit: '0.0000',
          subLedgerType: 'inventory_item',
          subLedgerEntityId: payload.subLedgerEntityId,
          departmentId: payload.departmentId,
          costCenterId: payload.costCenterId,
          projectId: payload.projectId,
        });

        // Line 2: Credit Goods Received Not Invoiced (#2020) or AP (#2010)
        const grniAcc = accounts.find((a) => a.code === '2020') || accounts.find((a) => a.code === '2010') || accounts[0];
        lines.push({
          accountId: grniAcc.id,
          lineNumber: 2,
          description: `GRNI Clearing: ${payload.documentNumber}`,
          debitAmount: '0.0000',
          creditAmount: amountVal.toFixed(4),
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: '0.0000',
          baseCredit: (amountVal * rate).toFixed(4),
          subLedgerType: grniAcc.code === '2010' ? 'supplier' : undefined,
          subLedgerEntityId: grniAcc.code === '2010' ? payload.subLedgerEntityId : undefined,
        });
        break;
      }

      case 'SALES_DELIVERY_POSTED': {
        // Line 1: Debit Cost of Goods Sold (#5010)
        const cogsAcc = accounts.find((a) => a.code === '5010') || accounts[0];
        lines.push({
          accountId: cogsAcc.id,
          lineNumber: 1,
          description: `COGS for Delivery: ${payload.documentNumber}`,
          debitAmount: amountVal.toFixed(4),
          creditAmount: '0.0000',
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: (amountVal * rate).toFixed(4),
          baseCredit: '0.0000',
          departmentId: payload.departmentId,
          costCenterId: payload.costCenterId,
          projectId: payload.projectId,
        });

        // Line 2: Credit Merchandise Inventory Asset (#1300)
        const invAcc = accounts.find((a) => a.code === '1300') || accounts[0];
        lines.push({
          accountId: invAcc.id,
          lineNumber: 2,
          description: `Inventory Outflow: ${payload.documentNumber}`,
          debitAmount: '0.0000',
          creditAmount: amountVal.toFixed(4),
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: '0.0000',
          baseCredit: (amountVal * rate).toFixed(4),
          subLedgerType: 'inventory_item',
          subLedgerEntityId: payload.subLedgerEntityId,
          departmentId: payload.departmentId,
          costCenterId: payload.costCenterId,
          projectId: payload.projectId,
        });
        break;
      }

      case 'INVENTORY_ADJUSTMENT_POSTED': {
        const invAcc = accounts.find((a) => a.code === '1300') || accounts[0];
        const varAcc = accounts.find((a) => a.code === '5010') || accounts.find((a) => a.code === '6090') || accounts[0];
        
        // Positive amount means found stock (Debit Inventory, Credit Variance)
        // Negative amount means shrinkage/damage (Debit Variance, Credit Inventory)
        if (amountVal >= 0) {
          lines.push({
            accountId: invAcc.id,
            lineNumber: 1,
            description: `Inventory Gain Adjustment: ${payload.documentNumber}`,
            debitAmount: amountVal.toFixed(4),
            creditAmount: '0.0000',
            currency: payload.currency || ctx.baseCurrency,
            exchangeRate: payload.exchangeRate || '1.000000',
            baseDebit: (amountVal * rate).toFixed(4),
            baseCredit: '0.0000',
            subLedgerType: 'inventory_item',
            subLedgerEntityId: payload.subLedgerEntityId,
          });
          lines.push({
            accountId: varAcc.id,
            lineNumber: 2,
            description: `Inventory Variance Gain: ${payload.documentNumber}`,
            debitAmount: '0.0000',
            creditAmount: amountVal.toFixed(4),
            currency: payload.currency || ctx.baseCurrency,
            exchangeRate: payload.exchangeRate || '1.000000',
            baseDebit: '0.0000',
            baseCredit: (amountVal * rate).toFixed(4),
          });
        } else {
          const absVal = Math.abs(amountVal);
          lines.push({
            accountId: varAcc.id,
            lineNumber: 1,
            description: `Inventory Shrinkage/Loss: ${payload.documentNumber}`,
            debitAmount: absVal.toFixed(4),
            creditAmount: '0.0000',
            currency: payload.currency || ctx.baseCurrency,
            exchangeRate: payload.exchangeRate || '1.000000',
            baseDebit: (absVal * rate).toFixed(4),
            baseCredit: '0.0000',
          });
          lines.push({
            accountId: invAcc.id,
            lineNumber: 2,
            description: `Inventory Loss Reduction: ${payload.documentNumber}`,
            debitAmount: '0.0000',
            creditAmount: absVal.toFixed(4),
            currency: payload.currency || ctx.baseCurrency,
            exchangeRate: payload.exchangeRate || '1.000000',
            baseDebit: '0.0000',
            baseCredit: (absVal * rate).toFixed(4),
            subLedgerType: 'inventory_item',
            subLedgerEntityId: payload.subLedgerEntityId,
          });
        }
        break;
      }

      case 'SUPPLIER_RETURN_POSTED': {
        // Debit GRNI / AP (#2020 / #2010), Credit Inventory (#1300)
        const grniAcc = accounts.find((a) => a.code === '2020') || accounts.find((a) => a.code === '2010') || accounts[0];
        const invAcc = accounts.find((a) => a.code === '1300') || accounts[0];

        lines.push({
          accountId: grniAcc.id,
          lineNumber: 1,
          description: `Supplier Return Debit: ${payload.documentNumber}`,
          debitAmount: amountVal.toFixed(4),
          creditAmount: '0.0000',
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: (amountVal * rate).toFixed(4),
          baseCredit: '0.0000',
        });
        lines.push({
          accountId: invAcc.id,
          lineNumber: 2,
          description: `Inventory Outflow Return: ${payload.documentNumber}`,
          debitAmount: '0.0000',
          creditAmount: amountVal.toFixed(4),
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: '0.0000',
          baseCredit: (amountVal * rate).toFixed(4),
          subLedgerType: 'inventory_item',
          subLedgerEntityId: payload.subLedgerEntityId,
        });
        break;
      }

      case 'CUSTOMER_RETURN_POSTED': {
        // Debit Inventory (#1300), Credit COGS (#5010)
        const invAcc = accounts.find((a) => a.code === '1300') || accounts[0];
        const cogsAcc = accounts.find((a) => a.code === '5010') || accounts[0];

        lines.push({
          accountId: invAcc.id,
          lineNumber: 1,
          description: `Customer Return to Inventory: ${payload.documentNumber}`,
          debitAmount: amountVal.toFixed(4),
          creditAmount: '0.0000',
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: (amountVal * rate).toFixed(4),
          baseCredit: '0.0000',
          subLedgerType: 'inventory_item',
          subLedgerEntityId: payload.subLedgerEntityId,
        });
        lines.push({
          accountId: cogsAcc.id,
          lineNumber: 2,
          description: `COGS Reversal on Return: ${payload.documentNumber}`,
          debitAmount: '0.0000',
          creditAmount: amountVal.toFixed(4),
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: '0.0000',
          baseCredit: (amountVal * rate).toFixed(4),
        });
        break;
      }

      case 'BANK_TRANSFER_POSTED': {
        // Debit Destination Bank (#1010), Credit Source Bank (#1010), optional Debit Transfer Fee (#6090)
        const destAcc = accounts.find((a) => a.id === payload.taxCodeId) || accounts.find((a) => a.code === '1010') || accounts[0];
        const srcAcc = accounts.find((a) => a.id === payload.departmentId) || accounts.find((a) => a.code === '1010') || accounts[0];
        const feeAmount = parseFloat(payload.taxAmount || '0.0000');
        const feeAcc = accounts.find((a) => a.code === '6090') || accounts.find((a) => a.code === '5010') || accounts[0];

        // Line 1: Destination Inflow
        lines.push({
          accountId: destAcc.id,
          lineNumber: 1,
          description: `Transfer Inward: ${payload.documentNumber}`,
          debitAmount: amountVal.toFixed(4),
          creditAmount: '0.0000',
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: (amountVal * rate).toFixed(4),
          baseCredit: '0.0000',
          subLedgerType: 'bank_account',
          subLedgerEntityId: payload.subLedgerEntityId,
        });

        // Line 2: Source Outflow
        const totalOutflow = amountVal + feeAmount;
        lines.push({
          accountId: srcAcc.id,
          lineNumber: 2,
          description: `Transfer Outward: ${payload.documentNumber}`,
          debitAmount: '0.0000',
          creditAmount: totalOutflow.toFixed(4),
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: '0.0000',
          baseCredit: (totalOutflow * rate).toFixed(4),
          subLedgerType: 'bank_account',
          subLedgerEntityId: payload.sourceId,
        });

        // Line 3: Fee Expense if applicable
        if (feeAmount > 0) {
          lines.push({
            accountId: feeAcc.id,
            lineNumber: 3,
            description: `Transfer Processing Fee: ${payload.documentNumber}`,
            debitAmount: feeAmount.toFixed(4),
            creditAmount: '0.0000',
            currency: payload.currency || ctx.baseCurrency,
            exchangeRate: payload.exchangeRate || '1.000000',
            baseDebit: (feeAmount * rate).toFixed(4),
            baseCredit: '0.0000',
          });
        }
        break;
      }

      case 'BANK_CHARGE_POSTED': {
        // Debit Bank Charges Expense (#6090 / #5010), Credit Bank (#1010)
        const feeAcc = accounts.find((a) => a.code === '6090') || accounts.find((a) => a.code === '5010') || accounts[0];
        const bankAcc = accounts.find((a) => a.id === payload.taxCodeId) || accounts.find((a) => a.code === '1010') || accounts[0];

        lines.push({
          accountId: feeAcc.id,
          lineNumber: 1,
          description: payload.memo || `Bank Service Fee: ${payload.documentNumber}`,
          debitAmount: amountVal.toFixed(4),
          creditAmount: '0.0000',
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: (amountVal * rate).toFixed(4),
          baseCredit: '0.0000',
        });
        lines.push({
          accountId: bankAcc.id,
          lineNumber: 2,
          description: payload.memo || `Bank Charge Deduction: ${payload.documentNumber}`,
          debitAmount: '0.0000',
          creditAmount: amountVal.toFixed(4),
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: '0.0000',
          baseCredit: (amountVal * rate).toFixed(4),
          subLedgerType: 'bank_account',
          subLedgerEntityId: payload.subLedgerEntityId,
        });
        break;
      }

      case 'BANK_INTEREST_POSTED': {
        // Debit Bank (#1010), Credit Interest Income (#4090 / #4020)
        const bankAcc = accounts.find((a) => a.id === payload.taxCodeId) || accounts.find((a) => a.code === '1010') || accounts[0];
        const incAcc = accounts.find((a) => a.code === '4090') || accounts.find((a) => a.code === '4020') || accounts[0];

        lines.push({
          accountId: bankAcc.id,
          lineNumber: 1,
          description: payload.memo || `Interest Deposit: ${payload.documentNumber}`,
          debitAmount: amountVal.toFixed(4),
          creditAmount: '0.0000',
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: (amountVal * rate).toFixed(4),
          baseCredit: '0.0000',
          subLedgerType: 'bank_account',
          subLedgerEntityId: payload.subLedgerEntityId,
        });
        lines.push({
          accountId: incAcc.id,
          lineNumber: 2,
          description: payload.memo || `Bank Interest Income: ${payload.documentNumber}`,
          debitAmount: '0.0000',
          creditAmount: amountVal.toFixed(4),
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: '0.0000',
          baseCredit: (amountVal * rate).toFixed(4),
        });
        break;
      }

      case 'GENERAL_RECEIPT_POSTED': {
        // Debit Bank/Cash (#1010/#1020), Credit Income (#4090 / #4010)
        const bankAcc = accounts.find((a) => a.id === payload.taxCodeId) || accounts.find((a) => a.code === '1010') || accounts[0];
        const revAcc = accounts.find((a) => a.id === payload.departmentId) || accounts.find((a) => a.code === '4090') || accounts.find((a) => a.code === '4010') || accounts[0];

        lines.push({
          accountId: bankAcc.id,
          lineNumber: 1,
          description: payload.memo || `General Receipt Inward: ${payload.documentNumber}`,
          debitAmount: amountVal.toFixed(4),
          creditAmount: '0.0000',
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: (amountVal * rate).toFixed(4),
          baseCredit: '0.0000',
          subLedgerType: 'bank_account',
          subLedgerEntityId: payload.subLedgerEntityId,
        });
        lines.push({
          accountId: revAcc.id,
          lineNumber: 2,
          description: payload.memo || `General Income: ${payload.documentNumber}`,
          debitAmount: '0.0000',
          creditAmount: amountVal.toFixed(4),
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: '0.0000',
          baseCredit: (amountVal * rate).toFixed(4),
        });
        break;
      }

      case 'GENERAL_PAYMENT_POSTED': {
        // Debit Expense (#5010 / #6090), Credit Bank/Cash (#1010/#1020)
        const expAcc = accounts.find((a) => a.id === payload.departmentId) || accounts.find((a) => a.code === '5010') || accounts.find((a) => a.code === '6090') || accounts[0];
        const bankAcc = accounts.find((a) => a.id === payload.taxCodeId) || accounts.find((a) => a.code === '1010') || accounts[0];

        lines.push({
          accountId: expAcc.id,
          lineNumber: 1,
          description: payload.memo || `General Expense: ${payload.documentNumber}`,
          debitAmount: amountVal.toFixed(4),
          creditAmount: '0.0000',
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: (amountVal * rate).toFixed(4),
          baseCredit: '0.0000',
        });
        lines.push({
          accountId: bankAcc.id,
          lineNumber: 2,
          description: payload.memo || `General Payment Outward: ${payload.documentNumber}`,
          debitAmount: '0.0000',
          creditAmount: amountVal.toFixed(4),
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: '0.0000',
          baseCredit: (amountVal * rate).toFixed(4),
          subLedgerType: 'bank_account',
          subLedgerEntityId: payload.subLedgerEntityId,
        });
        break;
      }

      case 'CASH_DEPOSIT_POSTED': {
        // Debit Bank (#1010), Credit Cash (#1020)
        const bankAcc = accounts.find((a) => a.id === payload.taxCodeId) || accounts.find((a) => a.code === '1010') || accounts[0];
        const cashAcc = accounts.find((a) => a.id === payload.departmentId) || accounts.find((a) => a.code === '1020') || accounts[0];

        lines.push({
          accountId: bankAcc.id,
          lineNumber: 1,
          description: `Cash Deposit Inward: ${payload.documentNumber}`,
          debitAmount: amountVal.toFixed(4),
          creditAmount: '0.0000',
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: (amountVal * rate).toFixed(4),
          baseCredit: '0.0000',
          subLedgerType: 'bank_account',
          subLedgerEntityId: payload.subLedgerEntityId,
        });
        lines.push({
          accountId: cashAcc.id,
          lineNumber: 2,
          description: `Cash Vault Deposit Outflow: ${payload.documentNumber}`,
          debitAmount: '0.0000',
          creditAmount: amountVal.toFixed(4),
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: '0.0000',
          baseCredit: (amountVal * rate).toFixed(4),
          subLedgerType: 'bank_account',
          subLedgerEntityId: payload.sourceId,
        });
        break;
      }

      case 'CASH_WITHDRAWAL_POSTED': {
        // Debit Cash (#1020), Credit Bank (#1010)
        const cashAcc = accounts.find((a) => a.id === payload.departmentId) || accounts.find((a) => a.code === '1020') || accounts[0];
        const bankAcc = accounts.find((a) => a.id === payload.taxCodeId) || accounts.find((a) => a.code === '1010') || accounts[0];

        lines.push({
          accountId: cashAcc.id,
          lineNumber: 1,
          description: `Petty Cash Inflow: ${payload.documentNumber}`,
          debitAmount: amountVal.toFixed(4),
          creditAmount: '0.0000',
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: (amountVal * rate).toFixed(4),
          baseCredit: '0.0000',
          subLedgerType: 'bank_account',
          subLedgerEntityId: payload.sourceId,
        });
        lines.push({
          accountId: bankAcc.id,
          lineNumber: 2,
          description: `Bank Withdrawal Outflow: ${payload.documentNumber}`,
          debitAmount: '0.0000',
          creditAmount: amountVal.toFixed(4),
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: '0.0000',
          baseCredit: (amountVal * rate).toFixed(4),
          subLedgerType: 'bank_account',
          subLedgerEntityId: payload.subLedgerEntityId,
        });
        break;
      }

      case 'CASH_COUNT_ADJUSTMENT_POSTED': {
        const cashAcc = accounts.find((a) => a.id === payload.taxCodeId) || accounts.find((a) => a.code === '1020') || accounts[0];
        const incAcc = accounts.find((a) => a.code === '4090') || accounts[0];
        const expAcc = accounts.find((a) => a.code === '6090') || accounts.find((a) => a.code === '5010') || accounts[0];
        const isPositive = amountVal >= 0;
        const absVal = Math.abs(amountVal);

        if (isPositive) {
          // Gain: Dr Cash (#1020), Cr Cash Over/Short Income (#4090)
          lines.push({
            accountId: cashAcc.id,
            lineNumber: 1,
            description: `Cash Count Surplus: ${payload.documentNumber}`,
            debitAmount: absVal.toFixed(4),
            creditAmount: '0.0000',
            currency: payload.currency || ctx.baseCurrency,
            exchangeRate: payload.exchangeRate || '1.000000',
            baseDebit: (absVal * rate).toFixed(4),
            baseCredit: '0.0000',
            subLedgerType: 'bank_account',
            subLedgerEntityId: payload.subLedgerEntityId,
          });
          lines.push({
            accountId: incAcc.id,
            lineNumber: 2,
            description: `Cash Count Over Variance: ${payload.documentNumber}`,
            debitAmount: '0.0000',
            creditAmount: absVal.toFixed(4),
            currency: payload.currency || ctx.baseCurrency,
            exchangeRate: payload.exchangeRate || '1.000000',
            baseDebit: '0.0000',
            baseCredit: (absVal * rate).toFixed(4),
          });
        } else {
          // Loss: Dr Cash Shortage Expense (#6090), Cr Cash (#1020)
          lines.push({
            accountId: expAcc.id,
            lineNumber: 1,
            description: `Cash Shortage Expense: ${payload.documentNumber}`,
            debitAmount: absVal.toFixed(4),
            creditAmount: '0.0000',
            currency: payload.currency || ctx.baseCurrency,
            exchangeRate: payload.exchangeRate || '1.000000',
            baseDebit: (absVal * rate).toFixed(4),
            baseCredit: '0.0000',
          });
          lines.push({
            accountId: cashAcc.id,
            lineNumber: 2,
            description: `Cash Count Deduction: ${payload.documentNumber}`,
            debitAmount: '0.0000',
            creditAmount: absVal.toFixed(4),
            currency: payload.currency || ctx.baseCurrency,
            exchangeRate: payload.exchangeRate || '1.000000',
            baseDebit: '0.0000',
            baseCredit: (absVal * rate).toFixed(4),
            subLedgerType: 'bank_account',
            subLedgerEntityId: payload.subLedgerEntityId,
          });
        }
        break;
      }

      case 'ASSET_CAPITALIZATION_POSTED':
      case 'ASSET_ACQUISITION_POSTED': {
        // Dr Fixed Asset (#1510), Cr Asset Clearing / AP / Bank (#1590 / #2010 / #1010)
        const assetAcc = accounts.find((a) => a.code === '1510') || accounts.find((a) => a.classification === 'asset') || accounts[0];
        const contraAcc = accounts.find((a) => a.code === '1590') || accounts.find((a) => a.code === '2010') || accounts.find((a) => a.code === '1010') || accounts[1] || accounts[0];

        lines.push({
          accountId: assetAcc.id,
          lineNumber: 1,
          description: `Asset Capitalization: ${payload.documentNumber}`,
          debitAmount: amountVal.toFixed(4),
          creditAmount: '0.0000',
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: (amountVal * rate).toFixed(4),
          baseCredit: '0.0000',
          departmentId: payload.departmentId,
          costCenterId: payload.costCenterId,
          projectId: payload.projectId,
          subLedgerType: 'fixed_asset',
          subLedgerEntityId: payload.subLedgerEntityId,
        });

        lines.push({
          accountId: contraAcc.id,
          lineNumber: 2,
          description: `Capitalization Offset: ${payload.documentNumber}`,
          debitAmount: '0.0000',
          creditAmount: amountVal.toFixed(4),
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: '0.0000',
          baseCredit: (amountVal * rate).toFixed(4),
        });
        break;
      }

      case 'ASSET_DEPRECIATION_POSTED': {
        // Dr Depreciation Expense (#6020), Cr Accumulated Depreciation (#1520)
        const expAcc = accounts.find((a) => a.code === '6020') || accounts.find((a) => a.classification === 'expense') || accounts[0];
        const accumDepAcc = accounts.find((a) => a.code === '1520') || accounts.find((a) => a.classification === 'asset') || accounts[1] || accounts[0];

        lines.push({
          accountId: expAcc.id,
          lineNumber: 1,
          description: `Depreciation Expense: ${payload.documentNumber}`,
          debitAmount: amountVal.toFixed(4),
          creditAmount: '0.0000',
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: (amountVal * rate).toFixed(4),
          baseCredit: '0.0000',
          departmentId: payload.departmentId,
          costCenterId: payload.costCenterId,
          projectId: payload.projectId,
        });

        lines.push({
          accountId: accumDepAcc.id,
          lineNumber: 2,
          description: `Accumulated Depreciation: ${payload.documentNumber}`,
          debitAmount: '0.0000',
          creditAmount: amountVal.toFixed(4),
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: '0.0000',
          baseCredit: (amountVal * rate).toFixed(4),
          subLedgerType: 'fixed_asset',
          subLedgerEntityId: payload.subLedgerEntityId,
        });
        break;
      }

      case 'ASSET_IMPAIRMENT_POSTED': {
        // Dr Loss on Impairment (#6085 / #6020), Cr Accumulated Impairment (#1530 / #1520)
        const lossAcc = accounts.find((a) => a.code === '6085') || accounts.find((a) => a.code === '6020') || accounts.find((a) => a.classification === 'expense') || accounts[0];
        const accumImpAcc = accounts.find((a) => a.code === '1530') || accounts.find((a) => a.code === '1520') || accounts[1] || accounts[0];

        lines.push({
          accountId: lossAcc.id,
          lineNumber: 1,
          description: `Asset Impairment Loss: ${payload.documentNumber}`,
          debitAmount: amountVal.toFixed(4),
          creditAmount: '0.0000',
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: (amountVal * rate).toFixed(4),
          baseCredit: '0.0000',
          departmentId: payload.departmentId,
          costCenterId: payload.costCenterId,
        });

        lines.push({
          accountId: accumImpAcc.id,
          lineNumber: 2,
          description: `Accumulated Impairment: ${payload.documentNumber}`,
          debitAmount: '0.0000',
          creditAmount: amountVal.toFixed(4),
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: '0.0000',
          baseCredit: (amountVal * rate).toFixed(4),
          subLedgerType: 'fixed_asset',
          subLedgerEntityId: payload.subLedgerEntityId,
        });
        break;
      }

      case 'ASSET_DISPOSAL_POSTED':
      case 'ASSET_WRITEOFF_POSTED': {
        // Handled via customLines for complete multi-line precision
        // Fallback standard 2-line if customLines not supplied
        const lossAcc = accounts.find((a) => a.code === '6085') || accounts.find((a) => a.classification === 'expense') || accounts[0];
        const assetAcc = accounts.find((a) => a.code === '1510') || accounts.find((a) => a.classification === 'asset') || accounts[1] || accounts[0];

        lines.push({
          accountId: lossAcc.id,
          lineNumber: 1,
          description: `Asset Disposal / Write-Off: ${payload.documentNumber}`,
          debitAmount: amountVal.toFixed(4),
          creditAmount: '0.0000',
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: (amountVal * rate).toFixed(4),
          baseCredit: '0.0000',
        });

        lines.push({
          accountId: assetAcc.id,
          lineNumber: 2,
          description: `Fixed Asset De-recognition: ${payload.documentNumber}`,
          debitAmount: '0.0000',
          creditAmount: amountVal.toFixed(4),
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: '0.0000',
          baseCredit: (amountVal * rate).toFixed(4),
          subLedgerType: 'fixed_asset',
          subLedgerEntityId: payload.subLedgerEntityId,
        });
        break;
      }

      // ======================================================================
      // PHASE 10: HR & PAYROLL POSTING RULES
      // ======================================================================
      case 'PAYROLL_RUN_POSTED':
      case 'PAYROLL_PERIOD_POSTED': {
        // Dr Salaries Expense (#6010 / #6012 / #6015), Cr Salaries Payable (#2300)
        const expAcc = accounts.find((a) => a.code === '6010') || accounts.find((a) => a.classification === 'expense') || accounts[0];
        const payableAcc = accounts.find((a) => a.code === '2300') || accounts.find((a) => a.classification === 'liability') || accounts[1] || accounts[0];

        lines.push({
          accountId: expAcc.id,
          lineNumber: 1,
          description: `Gross Salaries Expense: ${payload.documentNumber}`,
          debitAmount: amountVal.toFixed(4),
          creditAmount: '0.0000',
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: (amountVal * rate).toFixed(4),
          baseCredit: '0.0000',
          departmentId: payload.departmentId,
          costCenterId: payload.costCenterId,
        });

        if (payload.entries && payload.entries.length > 0) {
          let lineNum = 2;
          for (const empEntry of payload.entries) {
            const empNet = parseFloat((empEntry as any).netSalary || (empEntry as any).amount || '0');
            lines.push({
              accountId: payableAcc.id,
              lineNumber: lineNum++,
              description: `Accrued Salary: ${(empEntry as any).employeeName || (empEntry as any).description || payload.documentNumber}`,
              debitAmount: '0.0000',
              creditAmount: empNet.toFixed(4),
              currency: payload.currency || ctx.baseCurrency,
              exchangeRate: payload.exchangeRate || '1.000000',
              baseDebit: '0.0000',
              baseCredit: (empNet * rate).toFixed(4),
              subLedgerType: 'employee',
              subLedgerEntityId: (empEntry as any).employeeId || (empEntry as any).id || (empEntry as any).entityId,
            });
          }
        } else {
          lines.push({
            accountId: payableAcc.id,
            lineNumber: 2,
            description: `Accrued Salaries Payable: ${payload.documentNumber}`,
            debitAmount: '0.0000',
            creditAmount: amountVal.toFixed(4),
            currency: payload.currency || ctx.baseCurrency,
            exchangeRate: payload.exchangeRate || '1.000000',
            baseDebit: '0.0000',
            baseCredit: (amountVal * rate).toFixed(4),
            subLedgerType: 'employee',
            subLedgerEntityId: payload.subLedgerEntityId || 'emp-payroll-batch',
          });
        }
        break;
      }

      case 'SALARY_PAYMENT_DISBURSED': {
        // Dr Salaries Payable (#2300), Cr Operating Bank (#1010 / #1020)
        const payableAcc = accounts.find((a) => a.code === '2300') || accounts.find((a) => a.classification === 'liability') || accounts[0];
        const bankAcc = accounts.find((a) => a.code === '1010') || accounts.find((a) => a.code === '1020') || accounts.find((a) => a.classification === 'asset') || accounts[1] || accounts[0];

        if (payload.entries && payload.entries.length > 0) {
          let lineNum = 1;
          for (const empEntry of payload.entries) {
            const empNet = parseFloat((empEntry as any).netSalary || (empEntry as any).amount || '0');
            lines.push({
              accountId: payableAcc.id,
              lineNumber: lineNum++,
              description: `Salary Settlement Disbursement: ${(empEntry as any).employeeName || (empEntry as any).description || payload.documentNumber}`,
              debitAmount: empNet.toFixed(4),
              creditAmount: '0.0000',
              currency: payload.currency || ctx.baseCurrency,
              exchangeRate: payload.exchangeRate || '1.000000',
              baseDebit: (empNet * rate).toFixed(4),
              baseCredit: '0.0000',
              subLedgerType: 'employee',
              subLedgerEntityId: (empEntry as any).employeeId || (empEntry as any).id || (empEntry as any).entityId,
            });
          }
        } else {
          lines.push({
            accountId: payableAcc.id,
            lineNumber: 1,
            description: `Salary Settlement Disbursement: ${payload.documentNumber}`,
            debitAmount: amountVal.toFixed(4),
            creditAmount: '0.0000',
            currency: payload.currency || ctx.baseCurrency,
            exchangeRate: payload.exchangeRate || '1.000000',
            baseDebit: (amountVal * rate).toFixed(4),
            baseCredit: '0.0000',
            subLedgerType: 'employee',
            subLedgerEntityId: payload.subLedgerEntityId || 'emp-payroll-batch',
          });
        }

        lines.push({
          accountId: bankAcc.id,
          lineNumber: lines.length + 1,
          description: `Bank Salary Payment Outflow: ${payload.documentNumber}`,
          debitAmount: '0.0000',
          creditAmount: amountVal.toFixed(4),
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: '0.0000',
          baseCredit: (amountVal * rate).toFixed(4),
          subLedgerType: 'bank_account',
          subLedgerEntityId: bankAcc.id,
        });
        break;
      }

      case 'EMPLOYEE_ADVANCE_DISBURSED': {
        // Dr Employee Advances (#1250), Cr Operating Bank (#1010)
        const advAcc = accounts.find((a) => a.code === '1250') || accounts.find((a) => a.code === '1400') || accounts.find((a) => a.classification === 'asset') || accounts[0];
        const bankAcc = accounts.find((a) => a.code === '1010') || accounts.find((a) => a.classification === 'asset') || accounts[1] || accounts[0];

        lines.push({
          accountId: advAcc.id,
          lineNumber: 1,
          description: `Employee Advance Disbursed: ${payload.documentNumber}`,
          debitAmount: amountVal.toFixed(4),
          creditAmount: '0.0000',
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: (amountVal * rate).toFixed(4),
          baseCredit: '0.0000',
          subLedgerType: 'employee',
          subLedgerEntityId: payload.subLedgerEntityId,
        });

        lines.push({
          accountId: bankAcc.id,
          lineNumber: 2,
          description: `Bank Advance Outflow: ${payload.documentNumber}`,
          debitAmount: '0.0000',
          creditAmount: amountVal.toFixed(4),
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: '0.0000',
          baseCredit: (amountVal * rate).toFixed(4),
          subLedgerType: 'bank_account',
        });
        break;
      }

      case 'EMPLOYEE_ADVANCE_RECOVERY_POSTED': {
        // Dr Salaries Payable (#2300), Cr Employee Advances (#1250)
        const payableAcc = accounts.find((a) => a.code === '2300') || accounts.find((a) => a.classification === 'liability') || accounts[0];
        const advAcc = accounts.find((a) => a.code === '1250') || accounts.find((a) => a.code === '1400') || accounts[1] || accounts[0];

        lines.push({
          accountId: payableAcc.id,
          lineNumber: 1,
          description: `Payroll Advance Recovery Offset: ${payload.documentNumber}`,
          debitAmount: amountVal.toFixed(4),
          creditAmount: '0.0000',
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: (amountVal * rate).toFixed(4),
          baseCredit: '0.0000',
          subLedgerType: 'employee',
          subLedgerEntityId: payload.subLedgerEntityId,
        });

        lines.push({
          accountId: advAcc.id,
          lineNumber: 2,
          description: `Employee Advance Balance Reduction: ${payload.documentNumber}`,
          debitAmount: '0.0000',
          creditAmount: amountVal.toFixed(4),
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: '0.0000',
          baseCredit: (amountVal * rate).toFixed(4),
          subLedgerType: 'employee',
          subLedgerEntityId: payload.subLedgerEntityId,
        });
        break;
      }

      case 'FINAL_SETTLEMENT_POSTED': {
        // Dr Salaries & Gratuity Expense (#6010 / #6018), Cr Settlement Payable (#2300)
        const expAcc = accounts.find((a) => a.code === '6018') || accounts.find((a) => a.code === '6010') || accounts.find((a) => a.classification === 'expense') || accounts[0];
        const payableAcc = accounts.find((a) => a.code === '2300') || accounts.find((a) => a.classification === 'liability') || accounts[1] || accounts[0];

        lines.push({
          accountId: expAcc.id,
          lineNumber: 1,
          description: `Employee Final Settlement & Gratuity: ${payload.documentNumber}`,
          debitAmount: amountVal.toFixed(4),
          creditAmount: '0.0000',
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: (amountVal * rate).toFixed(4),
          baseCredit: '0.0000',
          departmentId: payload.departmentId,
          costCenterId: payload.costCenterId,
        });

        lines.push({
          accountId: payableAcc.id,
          lineNumber: 2,
          description: `Accrued Final Settlement Payable: ${payload.documentNumber}`,
          debitAmount: '0.0000',
          creditAmount: amountVal.toFixed(4),
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: '0.0000',
          baseCredit: (amountVal * rate).toFixed(4),
          subLedgerType: 'employee',
          subLedgerEntityId: payload.subLedgerEntityId,
        });
        break;
      }

      case 'TAX_RETURN_FILED': {
        // If customLines are provided, map directly with full precision
        if (payload.customLines && payload.customLines.length > 0) {
          payload.customLines.forEach((cl, idx) => {
            const acc = accounts.find((a) => a.code === cl.accountCode) || accounts[0];
            const dVal = parseFloat(cl.debitAmount || '0');
            const cVal = parseFloat(cl.creditAmount || '0');
            lines.push({
              accountId: acc.id,
              lineNumber: idx + 1,
              description: cl.description || payload.memo,
              debitAmount: dVal.toFixed(4),
              creditAmount: cVal.toFixed(4),
              currency: payload.currency || ctx.baseCurrency,
              exchangeRate: payload.exchangeRate || '1.000000',
              baseDebit: (dVal * rate).toFixed(4),
              baseCredit: (cVal * rate).toFixed(4),
              subLedgerType: cl.subLedgerType,
              subLedgerEntityId: cl.subLedgerEntityId,
            });
          });
        } else {
          // Default: Dr Output VAT (#2200), Cr Net Tax Payable (#2210)
          const outputAcc = accounts.find((a) => a.code === '2200') || accounts.find((a) => a.classification === 'liability') || accounts[0];
          const netPayableAcc = accounts.find((a) => a.code === '2210') || accounts.find((a) => a.code === '2200') || accounts[0];
          lines.push({
            accountId: outputAcc.id,
            lineNumber: 1,
            description: `Settlement of Output Tax: ${payload.documentNumber}`,
            debitAmount: amountVal.toFixed(4),
            creditAmount: '0.0000',
            currency: payload.currency || ctx.baseCurrency,
            exchangeRate: payload.exchangeRate || '1.000000',
            baseDebit: (amountVal * rate).toFixed(4),
            baseCredit: '0.0000',
          });
          lines.push({
            accountId: netPayableAcc.id,
            lineNumber: 2,
            description: `Accrued Net Tax Liability: ${payload.documentNumber}`,
            debitAmount: '0.0000',
            creditAmount: amountVal.toFixed(4),
            currency: payload.currency || ctx.baseCurrency,
            exchangeRate: payload.exchangeRate || '1.000000',
            baseDebit: '0.0000',
            baseCredit: (amountVal * rate).toFixed(4),
            subLedgerType: 'tax_jurisdiction',
            subLedgerEntityId: payload.subLedgerEntityId,
          });
        }
        break;
      }

      case 'TAX_PAYMENT_DISBURSED': {
        // Dr Net Tax Payable (#2210 / #2200), Cr Bank (#1010)
        const payableAcc = accounts.find((a) => a.code === '2210') || accounts.find((a) => a.code === '2200') || accounts[0];
        const bankAcc = accounts.find((a) => a.code === '1010') || accounts.find((a) => a.classification === 'asset') || accounts[0];

        lines.push({
          accountId: payableAcc.id,
          lineNumber: 1,
          description: `Discharge Tax Authority Liability: ${payload.documentNumber}`,
          debitAmount: amountVal.toFixed(4),
          creditAmount: '0.0000',
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: (amountVal * rate).toFixed(4),
          baseCredit: '0.0000',
          subLedgerType: 'tax_jurisdiction',
          subLedgerEntityId: payload.subLedgerEntityId,
        });

        lines.push({
          accountId: bankAcc.id,
          lineNumber: 2,
          description: `Tax Authority Bank Remittance: ${payload.documentNumber}`,
          debitAmount: '0.0000',
          creditAmount: amountVal.toFixed(4),
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: '0.0000',
          baseCredit: (amountVal * rate).toFixed(4),
          subLedgerType: 'bank_account',
          subLedgerEntityId: payload.branchId,
        });
        break;
      }

      case 'TAX_REFUND_RECEIVED': {
        // Dr Bank (#1010), Cr Net Tax Refund Receivable (#1460 / #1450)
        const bankAcc = accounts.find((a) => a.code === '1010') || accounts[0];
        const recAcc = accounts.find((a) => a.code === '1460') || accounts.find((a) => a.code === '1450') || accounts[0];

        lines.push({
          accountId: bankAcc.id,
          lineNumber: 1,
          description: `Tax Authority Refund Deposit: ${payload.documentNumber}`,
          debitAmount: amountVal.toFixed(4),
          creditAmount: '0.0000',
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: (amountVal * rate).toFixed(4),
          baseCredit: '0.0000',
          subLedgerType: 'bank_account',
          subLedgerEntityId: payload.branchId,
        });

        lines.push({
          accountId: recAcc.id,
          lineNumber: 2,
          description: `Settlement of Tax Authority Refund: ${payload.documentNumber}`,
          debitAmount: '0.0000',
          creditAmount: amountVal.toFixed(4),
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: '0.0000',
          baseCredit: (amountVal * rate).toFixed(4),
          subLedgerType: 'tax_jurisdiction',
          subLedgerEntityId: payload.subLedgerEntityId,
        });
        break;
      }

      case 'TAX_ADJUSTMENT_POSTED': {
        if (payload.customLines && payload.customLines.length > 0) {
          payload.customLines.forEach((cl, idx) => {
            const acc = accounts.find((a) => a.code === cl.accountCode) || accounts[0];
            const dVal = parseFloat(cl.debitAmount || '0');
            const cVal = parseFloat(cl.creditAmount || '0');
            lines.push({
              accountId: acc.id,
              lineNumber: idx + 1,
              description: cl.description || payload.memo,
              debitAmount: dVal.toFixed(4),
              creditAmount: cVal.toFixed(4),
              currency: payload.currency || ctx.baseCurrency,
              exchangeRate: payload.exchangeRate || '1.000000',
              baseDebit: (dVal * rate).toFixed(4),
              baseCredit: (cVal * rate).toFixed(4),
              subLedgerType: cl.subLedgerType,
              subLedgerEntityId: cl.subLedgerEntityId,
            });
          });
        } else {
          // Dr Tax Rounding/Adjustment Expense (#6080), Cr Output VAT (#2200)
          const expAcc = accounts.find((a) => a.code === '6080') || accounts.find((a) => a.classification === 'expense') || accounts[0];
          const taxAcc = accounts.find((a) => a.code === '2200') || accounts.find((a) => a.classification === 'liability') || accounts[0];

          lines.push({
            accountId: expAcc.id,
            lineNumber: 1,
            description: `Tax Adjustment Expense: ${payload.memo || payload.documentNumber}`,
            debitAmount: amountVal.toFixed(4),
            creditAmount: '0.0000',
            currency: payload.currency || ctx.baseCurrency,
            exchangeRate: payload.exchangeRate || '1.000000',
            baseDebit: (amountVal * rate).toFixed(4),
            baseCredit: '0.0000',
          });

          lines.push({
            accountId: taxAcc.id,
            lineNumber: 2,
            description: `Tax Adjustment Control: ${payload.memo || payload.documentNumber}`,
            debitAmount: '0.0000',
            creditAmount: amountVal.toFixed(4),
            currency: payload.currency || ctx.baseCurrency,
            exchangeRate: payload.exchangeRate || '1.000000',
            baseDebit: '0.0000',
            baseCredit: (amountVal * rate).toFixed(4),
            subLedgerType: 'tax_jurisdiction',
            subLedgerEntityId: payload.subLedgerEntityId,
          });
        }
        break;
      }

      case 'PROJECT_BILLING_POSTED': {
        // Dr Accounts Receivable (#1200), Cr Project / Consulting Revenue (#4020 / #4010), Cr Output VAT (#2200 if tax applicable)
        const arAcc = accounts.find((a) => a.code === '1200') || accounts.find((a) => a.classification === 'asset') || accounts[0];
        const revAcc = accounts.find((a) => a.code === '4020') || accounts.find((a) => a.code === '4010') || accounts.find((a) => a.classification === 'revenue') || accounts[0];
        const taxAcc = accounts.find((a) => a.code === '2200') || accounts.find((a) => a.classification === 'liability') || accounts[0];

        lines.push({
          accountId: arAcc.id,
          lineNumber: 1,
          description: `Project Invoice Receivable: ${payload.memo || payload.documentNumber}`,
          debitAmount: amountVal.toFixed(4),
          creditAmount: '0.0000',
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: (amountVal * rate).toFixed(4),
          baseCredit: '0.0000',
          subLedgerType: 'customer',
          subLedgerEntityId: payload.subLedgerEntityId,
          projectId: payload.projectId,
          departmentId: payload.departmentId,
          costCenterId: payload.costCenterId,
        });

        lines.push({
          accountId: revAcc.id,
          lineNumber: 2,
          description: `Project Contract Revenue: ${payload.memo || payload.documentNumber}`,
          debitAmount: '0.0000',
          creditAmount: netVal.toFixed(4),
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: '0.0000',
          baseCredit: (netVal * rate).toFixed(4),
          subLedgerType: 'project',
          subLedgerEntityId: payload.projectId,
          projectId: payload.projectId,
          departmentId: payload.departmentId,
          costCenterId: payload.costCenterId,
        });

        if (taxVal > 0) {
          lines.push({
            accountId: taxAcc.id,
            lineNumber: 3,
            description: `Project Output Tax: ${payload.memo || payload.documentNumber}`,
            debitAmount: '0.0000',
            creditAmount: taxVal.toFixed(4),
            currency: payload.currency || ctx.baseCurrency,
            exchangeRate: payload.exchangeRate || '1.000000',
            baseDebit: '0.0000',
            baseCredit: (taxVal * rate).toFixed(4),
            subLedgerType: 'tax_code',
            subLedgerEntityId: payload.taxCodeId,
            projectId: payload.projectId,
          });
        }
        break;
      }

      case 'PROJECT_COST_ALLOCATED': {
        // Dr Direct Project Costs (#5010 / #5020), Cr Accrued Payroll (#2300) / Clearing
        const costAcc = accounts.find((a) => a.code === '5010') || accounts.find((a) => a.classification === 'cost_of_sales') || accounts.find((a) => a.classification === 'expense') || accounts[0];
        const contraAcc = accounts.find((a) => a.code === '2300') || accounts.find((a) => a.code === '1010') || accounts.find((a) => a.code === '1520') || accounts[1] || accounts[0];

        lines.push({
          accountId: costAcc.id,
          lineNumber: 1,
          description: `Direct Project Cost Allocation: ${payload.memo || payload.documentNumber}`,
          debitAmount: amountVal.toFixed(4),
          creditAmount: '0.0000',
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: (amountVal * rate).toFixed(4),
          baseCredit: '0.0000',
          subLedgerType: 'project',
          subLedgerEntityId: payload.projectId,
          projectId: payload.projectId,
          departmentId: payload.departmentId,
          costCenterId: payload.costCenterId,
        });

        lines.push({
          accountId: contraAcc.id,
          lineNumber: 2,
          description: `Project Cost Contra Allocation: ${payload.memo || payload.documentNumber}`,
          debitAmount: '0.0000',
          creditAmount: amountVal.toFixed(4),
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: '0.0000',
          baseCredit: (amountVal * rate).toFixed(4),
          subLedgerType: payload.subLedgerType,
          subLedgerEntityId: payload.subLedgerEntityId,
        });
        break;
      }

      case 'PROJECT_WIP_CAPITALIZED': {
        // Dr Work In Progress (WIP) Projects (#1350), Cr Direct Project Cost Clearing (#5010)
        const wipAcc = accounts.find((a) => a.code === '1350') || accounts.find((a) => a.classification === 'asset') || accounts[0];
        const clrAcc = accounts.find((a) => a.code === '5010') || accounts.find((a) => a.classification === 'cost_of_sales') || accounts.find((a) => a.classification === 'expense') || accounts[1] || accounts[0];

        lines.push({
          accountId: wipAcc.id,
          lineNumber: 1,
          description: `Capitalize to Project WIP: ${payload.memo || payload.documentNumber}`,
          debitAmount: amountVal.toFixed(4),
          creditAmount: '0.0000',
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: (amountVal * rate).toFixed(4),
          baseCredit: '0.0000',
          subLedgerType: 'project',
          subLedgerEntityId: payload.projectId,
          projectId: payload.projectId,
        });

        lines.push({
          accountId: clrAcc.id,
          lineNumber: 2,
          description: `Project Cost Capitalized Offset: ${payload.memo || payload.documentNumber}`,
          debitAmount: '0.0000',
          creditAmount: amountVal.toFixed(4),
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: '0.0000',
          baseCredit: (amountVal * rate).toFixed(4),
          subLedgerType: 'project',
          subLedgerEntityId: payload.projectId,
          projectId: payload.projectId,
        });
        break;
      }

      case 'PROJECT_WIP_TRANSFER': {
        // Dr Cost of Goods Sold (#5010), Cr Work In Progress (WIP) Projects (#1350)
        const cogsAcc = accounts.find((a) => a.code === '5010') || accounts.find((a) => a.classification === 'cost_of_sales') || accounts.find((a) => a.classification === 'expense') || accounts[0];
        const wipAcc = accounts.find((a) => a.code === '1350') || accounts.find((a) => a.classification === 'asset') || accounts[1] || accounts[0];

        lines.push({
          accountId: cogsAcc.id,
          lineNumber: 1,
          description: `WIP Cost Realization to COGS: ${payload.memo || payload.documentNumber}`,
          debitAmount: amountVal.toFixed(4),
          creditAmount: '0.0000',
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: (amountVal * rate).toFixed(4),
          baseCredit: '0.0000',
          subLedgerType: 'project',
          subLedgerEntityId: payload.projectId,
          projectId: payload.projectId,
        });

        lines.push({
          accountId: wipAcc.id,
          lineNumber: 2,
          description: `WIP Asset Relief: ${payload.memo || payload.documentNumber}`,
          debitAmount: '0.0000',
          creditAmount: amountVal.toFixed(4),
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: '0.0000',
          baseCredit: (amountVal * rate).toFixed(4),
          subLedgerType: 'project',
          subLedgerEntityId: payload.projectId,
          projectId: payload.projectId,
        });
        break;
      }

      case 'COST_ALLOCATION_POSTED': {
        if (payload.customLines && payload.customLines.length > 0) {
          payload.customLines.forEach((cl, idx) => {
            const acc = cl.accountId 
              ? accounts.find((a) => a.id === cl.accountId) 
              : accounts.find((a) => a.code === cl.accountCode) || accounts[0];
            const deb = parseFloat(cl.debitAmount || '0');
            const cred = parseFloat(cl.creditAmount || '0');
            lines.push({
              accountId: acc ? acc.id : accounts[0].id,
              lineNumber: idx + 1,
              description: cl.description || payload.memo,
              debitAmount: deb.toFixed(4),
              creditAmount: cred.toFixed(4),
              currency: payload.currency || ctx.baseCurrency,
              exchangeRate: payload.exchangeRate || '1.000000',
              baseDebit: (deb * rate).toFixed(4),
              baseCredit: (cred * rate).toFixed(4),
              branchId: cl.branchId || payload.branchId,
              departmentId: cl.departmentId || payload.departmentId,
              costCenterId: cl.costCenterId || payload.costCenterId,
              businessUnitId: cl.businessUnitId || payload.businessUnitId,
              projectId: cl.projectId || payload.projectId,
              subLedgerType: cl.subLedgerType,
              subLedgerEntityId: cl.subLedgerEntityId,
              dimensions: cl.dimensions || payload.dimensions,
            });
          });
        } else {
          // Fallback: Dr Target Department/Cost Center (#5010), Cr Source Clearing (#6080)
          const targetAcc = accounts.find((a) => a.code === '5010') || accounts[0];
          const sourceAcc = accounts.find((a) => a.code === '6080') || accounts[0];
          lines.push({
            accountId: targetAcc.id,
            lineNumber: 1,
            description: `Cost Allocation Inflow: ${payload.memo || payload.documentNumber}`,
            debitAmount: amountVal.toFixed(4),
            creditAmount: '0.0000',
            currency: payload.currency || ctx.baseCurrency,
            exchangeRate: payload.exchangeRate || '1.000000',
            baseDebit: (amountVal * rate).toFixed(4),
            baseCredit: '0.0000',
            departmentId: payload.departmentId,
            costCenterId: payload.costCenterId,
            businessUnitId: payload.businessUnitId,
            projectId: payload.projectId,
          });
          lines.push({
            accountId: sourceAcc.id,
            lineNumber: 2,
            description: `Cost Allocation Outflow: ${payload.memo || payload.documentNumber}`,
            debitAmount: '0.0000',
            creditAmount: amountVal.toFixed(4),
            currency: payload.currency || ctx.baseCurrency,
            exchangeRate: payload.exchangeRate || '1.000000',
            baseDebit: '0.0000',
            baseCredit: (amountVal * rate).toFixed(4),
            departmentId: payload.departmentId,
            costCenterId: payload.costCenterId,
            businessUnitId: payload.businessUnitId,
            projectId: payload.projectId,
          });
        }
        break;
      }

      case 'INTERCOMPANY_TRANSACTION_POSTED': {
        if (payload.customLines && payload.customLines.length > 0) {
          payload.customLines.forEach((cl, idx) => {
            const acc = cl.accountId
              ? accounts.find((a) => a.id === cl.accountId)
              : accounts.find((a) => a.code === cl.accountCode) || accounts[0];
            const deb = parseFloat(cl.debitAmount || '0');
            const cred = parseFloat(cl.creditAmount || '0');
            lines.push({
              accountId: acc ? acc.id : accounts[0].id,
              lineNumber: idx + 1,
              description: cl.description || payload.memo,
              debitAmount: deb.toFixed(4),
              creditAmount: cred.toFixed(4),
              currency: payload.currency || ctx.baseCurrency,
              exchangeRate: payload.exchangeRate || '1.000000',
              baseDebit: (deb * rate).toFixed(4),
              baseCredit: (cred * rate).toFixed(4),
              branchId: cl.branchId || payload.branchId,
              departmentId: cl.departmentId || payload.departmentId,
              costCenterId: cl.costCenterId || payload.costCenterId,
              businessUnitId: cl.businessUnitId || payload.businessUnitId,
              projectId: cl.projectId || payload.projectId,
              subLedgerType: cl.subLedgerType || 'intercompany',
              subLedgerEntityId: cl.subLedgerEntityId,
              dimensions: cl.dimensions || payload.dimensions,
            });
          });
        } else if (payload.subLedgerType === 'customer') {
          // Source Entity: Dr Intercompany Receivable (#1220 / #1200), Cr Intercompany Revenue (#4010)
          const icRecAcc = accounts.find((a) => a.code === '1220') || accounts.find((a) => a.code === '1200') || accounts[0];
          const revAcc = accounts.find((a) => a.code === '4010') || accounts.find((a) => a.classification === 'revenue') || accounts[0];
          lines.push({
            accountId: icRecAcc.id,
            lineNumber: 1,
            description: `Intercompany Receivable: ${payload.memo || payload.documentNumber}`,
            debitAmount: amountVal.toFixed(4),
            creditAmount: '0.0000',
            currency: payload.currency || ctx.baseCurrency,
            exchangeRate: payload.exchangeRate || '1.000000',
            baseDebit: (amountVal * rate).toFixed(4),
            baseCredit: '0.0000',
            subLedgerType: 'intercompany',
            subLedgerEntityId: payload.subLedgerEntityId,
          });
          lines.push({
            accountId: revAcc.id,
            lineNumber: 2,
            description: `Intercompany Revenue: ${payload.memo || payload.documentNumber}`,
            debitAmount: '0.0000',
            creditAmount: amountVal.toFixed(4),
            currency: payload.currency || ctx.baseCurrency,
            exchangeRate: payload.exchangeRate || '1.000000',
            baseDebit: '0.0000',
            baseCredit: (amountVal * rate).toFixed(4),
            subLedgerType: 'intercompany',
            subLedgerEntityId: payload.subLedgerEntityId,
          });
        } else {
          // Target Entity: Dr Intercompany Expense (#6080 / #5010), Cr Intercompany Payable (#2020 / #2000)
          const expAcc = accounts.find((a) => a.code === '6080') || accounts.find((a) => a.code === '5010') || accounts.find((a) => a.classification === 'expense') || accounts[0];
          const icPayAcc = accounts.find((a) => a.code === '2020') || accounts.find((a) => a.code === '2000') || accounts.find((a) => a.code === '2100') || accounts[0];
          lines.push({
            accountId: expAcc.id,
            lineNumber: 1,
            description: `Intercompany Expense: ${payload.memo || payload.documentNumber}`,
            debitAmount: amountVal.toFixed(4),
            creditAmount: '0.0000',
            currency: payload.currency || ctx.baseCurrency,
            exchangeRate: payload.exchangeRate || '1.000000',
            baseDebit: (amountVal * rate).toFixed(4),
            baseCredit: '0.0000',
            subLedgerType: 'intercompany',
            subLedgerEntityId: payload.subLedgerEntityId,
          });
          lines.push({
            accountId: icPayAcc.id,
            lineNumber: 2,
            description: `Intercompany Payable: ${payload.memo || payload.documentNumber}`,
            debitAmount: '0.0000',
            creditAmount: amountVal.toFixed(4),
            currency: payload.currency || ctx.baseCurrency,
            exchangeRate: payload.exchangeRate || '1.000000',
            baseDebit: '0.0000',
            baseCredit: (amountVal * rate).toFixed(4),
            subLedgerType: 'intercompany',
            subLedgerEntityId: payload.subLedgerEntityId,
          });
        }
        break;
      }

      case 'CONSOLIDATION_ADJUSTMENT_POSTED': {
        if (payload.customLines && payload.customLines.length > 0) {
          payload.customLines.forEach((cl, idx) => {
            const acc = cl.accountId
              ? accounts.find((a) => a.id === cl.accountId)
              : accounts.find((a) => a.code === cl.accountCode) || accounts[0];
            const deb = parseFloat(cl.debitAmount || '0');
            const cred = parseFloat(cl.creditAmount || '0');
            lines.push({
              accountId: acc ? acc.id : accounts[0].id,
              lineNumber: idx + 1,
              description: cl.description || payload.memo,
              debitAmount: deb.toFixed(4),
              creditAmount: cred.toFixed(4),
              currency: payload.currency || ctx.baseCurrency,
              exchangeRate: payload.exchangeRate || '1.000000',
              baseDebit: (deb * rate).toFixed(4),
              baseCredit: (cred * rate).toFixed(4),
              subLedgerType: 'consolidation_entity',
              subLedgerEntityId: cl.subLedgerEntityId,
            });
          });
        }
        break;
      }

      case 'ACCRUAL_ENTRY_POSTED': {
        const debAcc = payload.debitAccountId
          ? accounts.find((a) => a.id === payload.debitAccountId || a.code === payload.debitAccountId) || accounts.find((a) => a.classification === 'expense') || accounts[0]
          : accounts.find((a) => a.code === '6090' || a.classification === 'expense') || accounts[0];
        const credAcc = payload.creditAccountId
          ? accounts.find((a) => a.id === payload.creditAccountId || a.code === payload.creditAccountId) || accounts.find((a) => a.classification === 'liability') || accounts[1] || accounts[0]
          : accounts.find((a) => a.code === '2400' || a.code === '2300' || a.classification === 'liability') || accounts[1] || accounts[0];

        lines.push({
          accountId: debAcc.id,
          lineNumber: 1,
          description: payload.memo || `Accrual Expense Debit: ${payload.documentNumber}`,
          debitAmount: amountVal.toFixed(4),
          creditAmount: '0.0000',
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: (amountVal * rate).toFixed(4),
          baseCredit: '0.0000',
          departmentId: payload.departmentId,
          costCenterId: payload.costCenterId,
          projectId: payload.projectId,
        });
        lines.push({
          accountId: credAcc.id,
          lineNumber: 2,
          description: payload.memo || `Accrued Liability Credit: ${payload.documentNumber}`,
          debitAmount: '0.0000',
          creditAmount: amountVal.toFixed(4),
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: '0.0000',
          baseCredit: (amountVal * rate).toFixed(4),
          departmentId: payload.departmentId,
          costCenterId: payload.costCenterId,
          projectId: payload.projectId,
        });
        break;
      }

      case 'ACCRUAL_REVERSAL_POSTED': {
        const debAcc = payload.debitAccountId
          ? accounts.find((a) => a.id === payload.debitAccountId || a.code === payload.debitAccountId) || accounts.find((a) => a.classification === 'liability') || accounts[1] || accounts[0]
          : accounts.find((a) => a.code === '2400' || a.code === '2300' || a.classification === 'liability') || accounts[1] || accounts[0];
        const credAcc = payload.creditAccountId
          ? accounts.find((a) => a.id === payload.creditAccountId || a.code === payload.creditAccountId) || accounts.find((a) => a.classification === 'expense') || accounts[0]
          : accounts.find((a) => a.code === '6090' || a.classification === 'expense') || accounts[0];

        lines.push({
          accountId: debAcc.id,
          lineNumber: 1,
          description: payload.memo || `Accrual Reversal Debit: ${payload.documentNumber}`,
          debitAmount: amountVal.toFixed(4),
          creditAmount: '0.0000',
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: (amountVal * rate).toFixed(4),
          baseCredit: '0.0000',
          departmentId: payload.departmentId,
          costCenterId: payload.costCenterId,
          projectId: payload.projectId,
        });
        lines.push({
          accountId: credAcc.id,
          lineNumber: 2,
          description: payload.memo || `Accrual Expense Reversal Credit: ${payload.documentNumber}`,
          debitAmount: '0.0000',
          creditAmount: amountVal.toFixed(4),
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: '0.0000',
          baseCredit: (amountVal * rate).toFixed(4),
          departmentId: payload.departmentId,
          costCenterId: payload.costCenterId,
          projectId: payload.projectId,
        });
        break;
      }

      case 'PREPAYMENT_AMORTIZATION_POSTED': {
        const expAcc = payload.debitAccountId
          ? accounts.find((a) => a.id === payload.debitAccountId) || accounts[0]
          : accounts.find((a) => a.code === '6010' || a.code === '6020' || a.classification === 'expense') || accounts[0];
        const prepAcc = payload.creditAccountId
          ? accounts.find((a) => a.id === payload.creditAccountId) || accounts[0]
          : accounts.find((a) => a.code === '1400' || a.classification === 'asset') || accounts[0];

        lines.push({
          accountId: expAcc.id,
          lineNumber: 1,
          description: payload.memo || `Amortization Expense: ${payload.documentNumber}`,
          debitAmount: amountVal.toFixed(4),
          creditAmount: '0.0000',
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: (amountVal * rate).toFixed(4),
          baseCredit: '0.0000',
          departmentId: payload.departmentId,
          costCenterId: payload.costCenterId,
          projectId: payload.projectId,
        });
        lines.push({
          accountId: prepAcc.id,
          lineNumber: 2,
          description: payload.memo || `Prepaid Asset Amortization: ${payload.documentNumber}`,
          debitAmount: '0.0000',
          creditAmount: amountVal.toFixed(4),
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: '0.0000',
          baseCredit: (amountVal * rate).toFixed(4),
          departmentId: payload.departmentId,
          costCenterId: payload.costCenterId,
          projectId: payload.projectId,
        });
        break;
      }

      case 'DEFERRED_REVENUE_RECOGNIZED': {
        const defRevAcc = payload.debitAccountId
          ? accounts.find((a) => a.id === payload.debitAccountId) || accounts[0]
          : accounts.find((a) => a.code === '2100' || a.classification === 'liability') || accounts[0];
        const revAcc = payload.creditAccountId
          ? accounts.find((a) => a.id === payload.creditAccountId) || accounts[0]
          : accounts.find((a) => a.code === '4010' || a.classification === 'revenue') || accounts[0];

        lines.push({
          accountId: defRevAcc.id,
          lineNumber: 1,
          description: payload.memo || `Deferred Revenue Realization: ${payload.documentNumber}`,
          debitAmount: amountVal.toFixed(4),
          creditAmount: '0.0000',
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: (amountVal * rate).toFixed(4),
          baseCredit: '0.0000',
          departmentId: payload.departmentId,
          costCenterId: payload.costCenterId,
          projectId: payload.projectId,
        });
        lines.push({
          accountId: revAcc.id,
          lineNumber: 2,
          description: payload.memo || `Earned Commercial Revenue: ${payload.documentNumber}`,
          debitAmount: '0.0000',
          creditAmount: amountVal.toFixed(4),
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: '0.0000',
          baseCredit: (amountVal * rate).toFixed(4),
          departmentId: payload.departmentId,
          costCenterId: payload.costCenterId,
          projectId: payload.projectId,
        });
        break;
      }

      case 'PROVISION_RECOGNIZED_POSTED': {
        const expAcc = payload.debitAccountId
          ? accounts.find((a) => a.id === payload.debitAccountId) || accounts[0]
          : accounts.find((a) => a.code === '6090' || a.classification === 'expense') || accounts[0];
        const provAcc = payload.creditAccountId
          ? accounts.find((a) => a.id === payload.creditAccountId) || accounts[1] || accounts[0]
          : accounts.find((a) => a.code === '2400' || a.classification === 'liability') || accounts[1] || accounts[0];

        lines.push({
          accountId: expAcc.id,
          lineNumber: 1,
          description: payload.memo || `Provision Expense Debit: ${payload.documentNumber}`,
          debitAmount: amountVal.toFixed(4),
          creditAmount: '0.0000',
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: (amountVal * rate).toFixed(4),
          baseCredit: '0.0000',
          departmentId: payload.departmentId,
          costCenterId: payload.costCenterId,
        });
        lines.push({
          accountId: provAcc.id,
          lineNumber: 2,
          description: payload.memo || `Provision Liability Credit: ${payload.documentNumber}`,
          debitAmount: '0.0000',
          creditAmount: amountVal.toFixed(4),
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: '0.0000',
          baseCredit: (amountVal * rate).toFixed(4),
          departmentId: payload.departmentId,
          costCenterId: payload.costCenterId,
        });
        break;
      }

      case 'PROVISION_UTILIZATION_POSTED': {
        const provAcc = payload.debitAccountId
          ? accounts.find((a) => a.id === payload.debitAccountId) || accounts[0]
          : accounts.find((a) => a.code === '2400' || a.classification === 'liability') || accounts[0];
        const bankAcc = payload.creditAccountId
          ? accounts.find((a) => a.id === payload.creditAccountId) || accounts[0]
          : accounts.find((a) => a.code === '1010' || a.code === '2010') || accounts[0];

        lines.push({
          accountId: provAcc.id,
          lineNumber: 1,
          description: payload.memo || `Provision Settlement: ${payload.documentNumber}`,
          debitAmount: amountVal.toFixed(4),
          creditAmount: '0.0000',
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: (amountVal * rate).toFixed(4),
          baseCredit: '0.0000',
        });
        lines.push({
          accountId: bankAcc.id,
          lineNumber: 2,
          description: payload.memo || `Provision Payment Outflow: ${payload.documentNumber}`,
          debitAmount: '0.0000',
          creditAmount: amountVal.toFixed(4),
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: '0.0000',
          baseCredit: (amountVal * rate).toFixed(4),
          subLedgerType: bankAcc.code === '1010' ? 'bank_account' : undefined,
          subLedgerEntityId: bankAcc.code === '1010' ? bankAcc.id : undefined,
        });
        break;
      }

      case 'PROVISION_REVERSAL_POSTED': {
        const provAcc = payload.debitAccountId
          ? accounts.find((a) => a.id === payload.debitAccountId) || accounts[0]
          : accounts.find((a) => a.code === '2400' || a.classification === 'liability') || accounts[0];
        const expAcc = payload.creditAccountId
          ? accounts.find((a) => a.id === payload.creditAccountId) || accounts[0]
          : accounts.find((a) => a.code === '6090' || a.classification === 'expense') || accounts[0];

        lines.push({
          accountId: provAcc.id,
          lineNumber: 1,
          description: payload.memo || `Provision Reversal: ${payload.documentNumber}`,
          debitAmount: amountVal.toFixed(4),
          creditAmount: '0.0000',
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: (amountVal * rate).toFixed(4),
          baseCredit: '0.0000',
        });
        lines.push({
          accountId: expAcc.id,
          lineNumber: 2,
          description: payload.memo || `Expense Reduction on Provision Reversal: ${payload.documentNumber}`,
          debitAmount: '0.0000',
          creditAmount: amountVal.toFixed(4),
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: '0.0000',
          baseCredit: (amountVal * rate).toFixed(4),
        });
        break;
      }

      case 'ECL_PROVISION_POSTED': {
        const expAcc = accounts.find((a) => a.code === '6090' || a.classification === 'expense') || accounts[0];
        const allowAcc = accounts.find((a) => a.code === '1210' || a.code === '1200') || accounts[0];

        lines.push({
          accountId: expAcc.id,
          lineNumber: 1,
          description: payload.memo || `ECL Impairment Expense: ${payload.documentNumber}`,
          debitAmount: amountVal.toFixed(4),
          creditAmount: '0.0000',
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: (amountVal * rate).toFixed(4),
          baseCredit: '0.0000',
        });
        lines.push({
          accountId: allowAcc.id,
          lineNumber: 2,
          description: payload.memo || `Allowance for Expected Credit Losses: ${payload.documentNumber}`,
          debitAmount: '0.0000',
          creditAmount: amountVal.toFixed(4),
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: '0.0000',
          baseCredit: (amountVal * rate).toFixed(4),
        });
        break;
      }

      case 'BAD_DEBT_WRITEOFF_POSTED': {
        const allowAcc = accounts.find((a) => a.code === '1210' || a.code === '6090') || accounts[0];
        const arAcc = accounts.find((a) => a.code === '1200') || accounts[0];

        lines.push({
          accountId: allowAcc.id,
          lineNumber: 1,
          description: payload.memo || `Bad Debt Write-off: ${payload.documentNumber}`,
          debitAmount: amountVal.toFixed(4),
          creditAmount: '0.0000',
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: (amountVal * rate).toFixed(4),
          baseCredit: '0.0000',
        });
        lines.push({
          accountId: arAcc.id,
          lineNumber: 2,
          description: payload.memo || `Trade Receivables Reduction: ${payload.documentNumber}`,
          debitAmount: '0.0000',
          creditAmount: amountVal.toFixed(4),
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: '0.0000',
          baseCredit: (amountVal * rate).toFixed(4),
          subLedgerType: 'customer',
          subLedgerEntityId: payload.subLedgerEntityId,
        });
        break;
      }

      case 'BAD_DEBT_RECOVERED_POSTED': {
        const bankAcc = accounts.find((a) => a.code === '1010') || accounts[0];
        const incAcc = accounts.find((a) => a.code === '4200' || a.code === '1210' || a.classification === 'other_income') || accounts[0];

        lines.push({
          accountId: bankAcc.id,
          lineNumber: 1,
          description: payload.memo || `Bad Debt Recovery Deposit: ${payload.documentNumber}`,
          debitAmount: amountVal.toFixed(4),
          creditAmount: '0.0000',
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: (amountVal * rate).toFixed(4),
          baseCredit: '0.0000',
          subLedgerType: 'bank_account',
          subLedgerEntityId: bankAcc.id,
        });
        lines.push({
          accountId: incAcc.id,
          lineNumber: 2,
          description: payload.memo || `Bad Debt Recovery Income: ${payload.documentNumber}`,
          debitAmount: '0.0000',
          creditAmount: amountVal.toFixed(4),
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: '0.0000',
          baseCredit: (amountVal * rate).toFixed(4),
        });
        break;
      }

      case 'EMPLOYEE_EXPENSE_CLAIM_POSTED': {
        const expAcc = payload.debitAccountId
          ? accounts.find((a) => a.id === payload.debitAccountId) || accounts[0]
          : accounts.find((a) => a.code === '6090' || a.classification === 'expense') || accounts[0];
        const payAcc = payload.creditAccountId
          ? accounts.find((a) => a.id === payload.creditAccountId) || accounts[0]
          : accounts.find((a) => a.code === '2040' || a.code === '2300' || a.classification === 'liability') || accounts[0];

        lines.push({
          accountId: expAcc.id,
          lineNumber: 1,
          description: payload.memo || `Employee Expense Claim: ${payload.documentNumber}`,
          debitAmount: amountVal.toFixed(4),
          creditAmount: '0.0000',
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: (amountVal * rate).toFixed(4),
          baseCredit: '0.0000',
          departmentId: payload.departmentId,
          costCenterId: payload.costCenterId,
          projectId: payload.projectId,
        });
        lines.push({
          accountId: payAcc.id,
          lineNumber: 2,
          description: payload.memo || `Payable to Staff: ${payload.documentNumber}`,
          debitAmount: '0.0000',
          creditAmount: amountVal.toFixed(4),
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: '0.0000',
          baseCredit: (amountVal * rate).toFixed(4),
          subLedgerType: 'employee',
          subLedgerEntityId: payload.subLedgerEntityId,
        });
        break;
      }

      case 'EMPLOYEE_EXPENSE_REIMBURSED': {
        const payAcc = payload.debitAccountId
          ? accounts.find((a) => a.id === payload.debitAccountId) || accounts[0]
          : accounts.find((a) => a.code === '2040' || a.code === '2300' || a.classification === 'liability') || accounts[0];
        const bankAcc = payload.creditAccountId
          ? accounts.find((a) => a.id === payload.creditAccountId) || accounts[0]
          : accounts.find((a) => a.code === '1010') || accounts[0];

        lines.push({
          accountId: payAcc.id,
          lineNumber: 1,
          description: payload.memo || `Staff Reimbursement: ${payload.documentNumber}`,
          debitAmount: amountVal.toFixed(4),
          creditAmount: '0.0000',
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: (amountVal * rate).toFixed(4),
          baseCredit: '0.0000',
          subLedgerType: 'employee',
          subLedgerEntityId: payload.subLedgerEntityId,
        });
        lines.push({
          accountId: bankAcc.id,
          lineNumber: 2,
          description: payload.memo || `Bank Outflow Reimbursement: ${payload.documentNumber}`,
          debitAmount: '0.0000',
          creditAmount: amountVal.toFixed(4),
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: '0.0000',
          baseCredit: (amountVal * rate).toFixed(4),
          subLedgerType: 'bank_account',
          subLedgerEntityId: bankAcc.id,
        });
        break;
      }

      default: {
        // Generic 2-line fallback
        const acc1 = accounts[0];
        const acc2 = accounts[1] || accounts[0];
        lines.push({
          accountId: acc1.id,
          lineNumber: 1,
          description: payload.memo || 'Debit Line',
          debitAmount: amountVal.toFixed(4),
          creditAmount: '0.0000',
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: (amountVal * rate).toFixed(4),
          baseCredit: '0.0000',
        });
        lines.push({
          accountId: acc2.id,
          lineNumber: 2,
          description: payload.memo || 'Credit Line',
          debitAmount: '0.0000',
          creditAmount: amountVal.toFixed(4),
          currency: payload.currency || ctx.baseCurrency,
          exchangeRate: payload.exchangeRate || '1.000000',
          baseDebit: '0.0000',
          baseCredit: (amountVal * rate).toFixed(4),
        });
      }
    }

    return lines;
  }
}

export const accountingPostingService = new AccountingPostingService();
