// ============================================================================
// Tax Sub-Ledger ↔ GL Tax Control Accounts Reconciliation Engine ($0.00 Variance)
// ============================================================================

import { db } from '@/database/storage';
import { TenantContext } from '@/core/types/common';
import { generalLedgerService } from '@/modules/accounting/services/general-ledger.service';

export interface TaxReconciliationReport {
  jurisdictionId?: string;
  asOfDate: string;
  isFullyReconciled: boolean;
  
  // Output Tax Analysis
  outputTaxSubLedgerAmount: string;
  outputTaxGLControlAmount: string; // Net Credits on #2200
  outputTaxVariance: string;

  // Input Tax Analysis
  inputTaxSubLedgerAmount: string; // Recoverable Input
  inputTaxGLControlAmount: string; // Net Debits on #1450
  inputTaxVariance: string;

  // Net Tax Liability
  netSubLedgerLiability: string; // Output - Recoverable Input
  netGLTaxLiability: string; // (#2200 + #2210) - (#1450 + #1460)
  netVariance: string;

  // Transaction counts & entity breakdown
  totalTaxTransactionsCount: number;
  unreconciledItemsCount: number;
  breakdownByTaxCode: Array<{
    taxCode: string;
    rate: string;
    subLedgerTaxAmount: string;
    glAccountCode: string;
    glBalance: string;
    variance: string;
  }>;
}

export class TaxReconciliationService {
  /**
   * Computes an exhaustive, real-time reconciliation matrix comparing the Tax Sub-Ledger
   * with the General Ledger Tax Control Accounts (#2200, #1450, #2210, #1460).
   */
  public getReconciliationReport(
    ctx: TenantContext,
    options?: { jurisdictionId?: string; asOfDate?: string }
  ): TaxReconciliationReport {
    const asOfDate = options?.asOfDate || new Date().toISOString().split('T')[0];
    const entries = db.getTaxLedgerEntries(ctx, {
      jurisdictionId: options?.jurisdictionId,
      endDate: asOfDate,
    });

    let subLedgerOutput = 0;
    let subLedgerRecoverableInput = 0;

    const subLedgerByCode: Record<string, { code: string; rate: string; amount: number; glAccountId: string }> = {};

    for (const e of entries) {
      if (e.status !== 'posted') continue;
      const baseTax = parseFloat(e.baseTaxAmount || '0');
      const baseRec = parseFloat(e.baseRecoverableAmount || '0');

      if (e.direction === 'output') {
        subLedgerOutput += baseTax;
      } else if (e.direction === 'input') {
        subLedgerRecoverableInput += baseRec;
      }

      if (!subLedgerByCode[e.taxCode]) {
        subLedgerByCode[e.taxCode] = {
          code: e.taxCode,
          rate: e.taxRate,
          amount: 0,
          glAccountId: e.glAccountId,
        };
      }
      subLedgerByCode[e.taxCode].amount += (e.direction === 'output' ? baseTax : baseRec);
    }

    // Query GL Control Balances from General Ledger Service
    const trialBalance = generalLedgerService.getTrialBalance(undefined, ctx);

    // GL #2200 Output Tax Payable (Net Credits = ClosingCredit - ClosingDebit)
    const row2200 = trialBalance.rows.find((r) => r.code === '2200');
    const glOutput = row2200
      ? parseFloat(row2200.closingCredit) - parseFloat(row2200.closingDebit)
      : 0;

    // GL #1450 Input Tax Recoverable (Net Debits = ClosingDebit - ClosingCredit)
    const row1450 = trialBalance.rows.find((r) => r.code === '1450');
    const glInput = row1450
      ? parseFloat(row1450.closingDebit) - parseFloat(row1450.closingCredit)
      : 0;

    // GL #2210 Net Tax Payable
    const row2210 = trialBalance.rows.find((r) => r.code === '2210');
    const glNetPayable = row2210
      ? parseFloat(row2210.closingCredit) - parseFloat(row2210.closingDebit)
      : 0;

    // GL #1460 Net Tax Refund Receivable
    const row1460 = trialBalance.rows.find((r) => r.code === '1460');
    const glNetRefundRec = row1460
      ? parseFloat(row1460.closingDebit) - parseFloat(row1460.closingCredit)
      : 0;

    const glNetTotal = (glOutput + glNetPayable) - (glInput + glNetRefundRec);
    const subLedgerNet = subLedgerOutput - subLedgerRecoverableInput;

    const outputVariance = Math.abs(subLedgerOutput - glOutput);
    const inputVariance = Math.abs(subLedgerRecoverableInput - glInput);
    const netVariance = Math.abs(subLedgerNet - glNetTotal);

    const isFullyReconciled = outputVariance < 0.0001 && inputVariance < 0.0001 && netVariance < 0.0001;

    // Build breakdown rows
    const accounts = db.getAccounts(ctx);
    const breakdown: TaxReconciliationReport['breakdownByTaxCode'] = Object.values(subLedgerByCode).map((item) => {
      const acc = accounts.find((a) => a.id === item.glAccountId);
      const accCode = acc ? acc.code : '2200';
      const tbRow = trialBalance.rows.find((r) => r.code === accCode);
      const glBal = tbRow
        ? (acc?.normalBalance === 'credit'
            ? parseFloat(tbRow.closingCredit) - parseFloat(tbRow.closingDebit)
            : parseFloat(tbRow.closingDebit) - parseFloat(tbRow.closingCredit))
        : 0;

      return {
        taxCode: item.code,
        rate: item.rate,
        subLedgerTaxAmount: item.amount.toFixed(4),
        glAccountCode: accCode,
        glBalance: glBal.toFixed(4),
        variance: Math.abs(item.amount - glBal).toFixed(4),
      };
    });

    return {
      jurisdictionId: options?.jurisdictionId,
      asOfDate,
      isFullyReconciled,
      outputTaxSubLedgerAmount: subLedgerOutput.toFixed(4),
      outputTaxGLControlAmount: glOutput.toFixed(4),
      outputTaxVariance: outputVariance.toFixed(4),
      inputTaxSubLedgerAmount: subLedgerRecoverableInput.toFixed(4),
      inputTaxGLControlAmount: glInput.toFixed(4),
      inputTaxVariance: inputVariance.toFixed(4),
      netSubLedgerLiability: subLedgerNet.toFixed(4),
      netGLTaxLiability: glNetTotal.toFixed(4),
      netVariance: netVariance.toFixed(4),
      totalTaxTransactionsCount: entries.length,
      unreconciledItemsCount: isFullyReconciled ? 0 : 1,
      breakdownByTaxCode: breakdown,
    };
  }
}

export const taxReconciliationService = new TaxReconciliationService();
