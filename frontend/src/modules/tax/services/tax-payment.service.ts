// ============================================================================
// Tax Payment & Refund Settlement Service (Banking Integration)
// ============================================================================

import { db } from '@/database/storage';
import { TenantContext } from '@/core/types/common';
import { DbTaxReturn } from '@/database/types';
import { accountingPostingService } from '@/modules/accounting/services/accounting-posting.service';

export interface TaxPaymentResult {
  taxReturn: DbTaxReturn;
  paymentAmount: string;
  paymentDate: string;
  bankAccountId: string;
  journalEntryId: string;
  bankTransactionId?: string;
}

export class TaxPaymentService {
  /**
   * Disburses tax liability payment to government tax authority via Banking & Cash module.
   */
  public disburseTaxPayment(
    payload: {
      taxReturnId: string;
      bankAccountId: string;
      paymentDate?: string;
      amount?: string | number; // Defaults to full netTaxPayable
      reference?: string;
      notes?: string;
    },
    ctx: TenantContext
  ): TaxPaymentResult {
    const tr = db.getTaxReturnById(payload.taxReturnId, ctx);
    if (!tr) throw new Error(`Tax return '${payload.taxReturnId}' not found`);

    const netTaxPayable = parseFloat(tr.netTaxPayableOrRefundable);
    if (netTaxPayable <= 0) {
      throw new Error(`Tax return '${tr.returnNumber}' does not have a net tax liability to pay (Net: $${tr.netTaxPayableOrRefundable})`);
    }

    const payAmount = payload.amount !== undefined ? parseFloat(String(payload.amount)) : netTaxPayable;
    if (payAmount <= 0) throw new Error('Payment amount must be greater than zero');

    const bankAccount = db.getBankAccountById(payload.bankAccountId, ctx);
    if (!bankAccount) throw new Error(`Bank account '${payload.bankAccountId}' not found`);

    const paymentDate = payload.paymentDate || new Date().toISOString().split('T')[0];
    const paymentRef = payload.reference || `TAX-PMT-${tr.returnNumber}`;

    // Post to General Ledger via centralized AccountingPostingService
    // Dr Net Tax Payable (#2210 / #2200), Cr Operating Bank Account (#1010)
    const journal = accountingPostingService.post(
      'TAX_PAYMENT_DISBURSED',
      {
        sourceType: 'TaxPayment',
        sourceId: tr.id,
        documentNumber: paymentRef,
        documentDate: paymentDate,
        memo: `Tax Authority Remittance: ${tr.returnNumber}`,
        currency: bankAccount.currency || ctx.baseCurrency,
        amount: payAmount.toFixed(4),
        subLedgerType: 'tax_jurisdiction',
        subLedgerEntityId: tr.jurisdictionId,
        branchId: bankAccount.id,
      },
      ctx
    );

    // Record treasury movement in banking material ledger
    let bankTxId: string | undefined;
    try {
      const bankTx = db.recordBankTransaction(
        {
          bankAccountId: bankAccount.id,
          transactionNumber: `TX-TAX-${Math.floor(1000 + Math.random() * 9000)}`,
          transactionDate: paymentDate,
          valueDate: paymentDate,
          transactionType: 'payment',
          amount: Math.abs(payAmount).toFixed(4),
          debitCredit: 'credit',
          currency: bankAccount.currency || ctx.baseCurrency,
          exchangeRate: '1.000000',
          baseAmount: Math.abs(payAmount).toFixed(4),
          reference: paymentRef,
          description: `Government Tax Remittance for ${tr.returnNumber}`,
          status: 'posted',
          journalEntryId: journal.id,
          reconciliationStatus: 'unreconciled',
        },
        ctx
      );
      bankTxId = bankTx.id;
    } catch (_err) {
      // Storage method fallback
    }

    // Update bank balance
    db.updateBankAccount(
      bankAccount.id,
      {
        currentBalance: (parseFloat(bankAccount.currentBalance) - payAmount).toFixed(4),
      },
      ctx
    );

    // Update tax return payment status
    const newPaymentStatus = payAmount >= netTaxPayable ? 'paid' : 'partially_paid';
    const updatedReturn = db.updateTaxReturn(
      tr.id,
      {
        paymentStatus: newPaymentStatus,
      },
      ctx
    );

    return {
      taxReturn: updatedReturn,
      paymentAmount: payAmount.toFixed(4),
      paymentDate,
      bankAccountId: bankAccount.id,
      journalEntryId: journal.id,
      bankTransactionId: bankTxId,
    };
  }

  /**
   * Records tax refund deposit received from government tax authority into bank account.
   */
  public receiveTaxRefund(
    payload: {
      taxReturnId: string;
      bankAccountId: string;
      receiptDate?: string;
      amount?: string | number;
      reference?: string;
      notes?: string;
    },
    ctx: TenantContext
  ): TaxPaymentResult {
    const tr = db.getTaxReturnById(payload.taxReturnId, ctx);
    if (!tr) throw new Error(`Tax return '${payload.taxReturnId}' not found`);

    const refundDue = Math.abs(parseFloat(tr.netTaxPayableOrRefundable));
    const refundAmount = payload.amount !== undefined ? parseFloat(String(payload.amount)) : refundDue;
    if (refundAmount <= 0) throw new Error('Refund amount must be greater than zero');

    const bankAccount = db.getBankAccountById(payload.bankAccountId, ctx);
    if (!bankAccount) throw new Error(`Bank account '${payload.bankAccountId}' not found`);

    const receiptDate = payload.receiptDate || new Date().toISOString().split('T')[0];
    const receiptRef = payload.reference || `TAX-REF-${tr.returnNumber}`;

    // Post to General Ledger via centralized AccountingPostingService
    // Dr Operating Bank Account (#1010), Cr Net Tax Refund Receivable (#1460 / #1450)
    const journal = accountingPostingService.post(
      'TAX_REFUND_RECEIVED',
      {
        sourceType: 'TaxRefund',
        sourceId: tr.id,
        documentNumber: receiptRef,
        documentDate: receiptDate,
        memo: `Tax Authority Refund Deposit: ${tr.returnNumber}`,
        currency: bankAccount.currency || ctx.baseCurrency,
        amount: refundAmount.toFixed(4),
        subLedgerType: 'tax_jurisdiction',
        subLedgerEntityId: tr.jurisdictionId,
        branchId: bankAccount.id,
      },
      ctx
    );

    // Record in banking ledger
    let bankTxId: string | undefined;
    try {
      const bankTx = db.recordBankTransaction(
        {
          bankAccountId: bankAccount.id,
          transactionNumber: `TX-TAXREF-${Math.floor(1000 + Math.random() * 9000)}`,
          transactionDate: receiptDate,
          valueDate: receiptDate,
          transactionType: 'receipt',
          amount: refundAmount.toFixed(4),
          debitCredit: 'debit',
          currency: bankAccount.currency || ctx.baseCurrency,
          exchangeRate: '1.000000',
          baseAmount: refundAmount.toFixed(4),
          reference: receiptRef,
          description: `Tax Authority Refund Deposit for ${tr.returnNumber}`,
          status: 'posted',
          journalEntryId: journal.id,
          reconciliationStatus: 'unreconciled',
        },
        ctx
      );
      bankTxId = bankTx.id;
    } catch (_err) {
      // Storage fallback
    }

    // Update bank balance
    db.updateBankAccount(
      bankAccount.id,
      {
        currentBalance: (parseFloat(bankAccount.currentBalance) + refundAmount).toFixed(4),
      },
      ctx
    );

    const updatedReturn = db.updateTaxReturn(
      tr.id,
      {
        paymentStatus: 'refunded',
      },
      ctx
    );

    return {
      taxReturn: updatedReturn,
      paymentAmount: refundAmount.toFixed(4),
      paymentDate: receiptDate,
      bankAccountId: bankAccount.id,
      journalEntryId: journal.id,
      bankTransactionId: bankTxId,
    };
  }
}

export const taxPaymentService = new TaxPaymentService();
