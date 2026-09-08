// ============================================================================
// Accounts Payable (AP) Sub-Ledger, Credit Control, Aging & Payments Service
// ============================================================================

import { db } from '@/database/storage';
import { TenantContext } from '@/core/types/common';
import { 
  PaymentMethod,
  DbSupplierPayment, 
  DbBillPaymentAllocation 
} from '@/database/types';
import { accountingPostingService } from '@/modules/accounting/services/accounting-posting.service';
import { PeriodClosedError } from '@/core/errors/DomainErrors';

export interface SupplierCreditSummary {
  supplierId: string;
  supplierName: string;
  currency: string;
  paymentTermsDays: number;
  creditLimit: string;
  totalBilled: string;
  totalPaid: string;
  outstandingBalance: string;
  overdueAmount: string;
  unallocatedAdvances: string;
  unpaidBillsCount: number;
}

export interface SupplierStatementLine {
  id: string;
  date: string;
  type: 'BILL' | 'PAYMENT' | 'CREDIT_NOTE' | 'DEBIT_NOTE';
  reference: string;
  memo: string;
  debit: string;
  credit: string;
  runningBalance: string;
}

export interface SupplierStatement {
  supplierId: string;
  supplierName: string;
  currency: string;
  openingBalance: string;
  closingBalance: string;
  lines: SupplierStatementLine[];
}

export interface APAgingBucket {
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  currency: string;
  current: string;      // 0 - 30 days
  days31to60: string;   // 31 - 60 days
  days61to90: string;   // 61 - 90 days
  over90Days: string;   // 90+ days
  totalOutstanding: string;
}

export interface APAgingReport {
  asOfDate: string;
  totalPayables: string;
  buckets: {
    currentTotal: string;
    days31to60Total: string;
    days61to90Total: string;
    over90DaysTotal: string;
  };
  rows: APAgingBucket[];
}

export class AccountsPayableService {
  /**
   * Computes real-time dynamic credit and payable metrics for a supplier
   */
  public getSupplierCreditSummary(supplierId: string, ctx: TenantContext): SupplierCreditSummary {
    const supplier = db.getSupplierById(supplierId, ctx);
    if (!supplier) throw new Error(`Supplier '${supplierId}' not found`);

    const bills = db.getSupplierBills(ctx).filter((b) => b.supplierId === supplierId && b.status === 'posted');
    const payments = db.getSupplierPayments(ctx).filter((p) => p.supplierId === supplierId && p.status === 'posted');

    const totalBilled = bills.reduce((sum, b) => sum + parseFloat(b.total), 0);
    const totalPaid = bills.reduce((sum, b) => sum + parseFloat(b.amountPaid), 0);
    const outstanding = bills.reduce((sum, b) => sum + parseFloat(b.balanceDue), 0);
    const unallocatedAdvances = payments.reduce((sum, p) => sum + parseFloat(p.unallocatedAmount || '0'), 0);

    const todayStr = new Date().toISOString().slice(0, 10);
    const overdue = bills
      .filter((b) => b.dueDate < todayStr && parseFloat(b.balanceDue) > 0)
      .reduce((sum, b) => sum + parseFloat(b.balanceDue), 0);

    const unpaidCount = bills.filter((b) => parseFloat(b.balanceDue) > 0).length;

    return {
      supplierId: supplier.id,
      supplierName: supplier.name,
      currency: supplier.currency || ctx.baseCurrency,
      paymentTermsDays: supplier.paymentTermsDays,
      creditLimit: supplier.creditLimit || '0.0000',
      totalBilled: totalBilled.toFixed(4),
      totalPaid: totalPaid.toFixed(4),
      outstandingBalance: outstanding.toFixed(4),
      overdueAmount: overdue.toFixed(4),
      unallocatedAdvances: unallocatedAdvances.toFixed(4),
      unpaidBillsCount: unpaidCount,
    };
  }

  /**
   * Generates chronological supplier statement of account with running balance
   */
  public getSupplierStatement(
    supplierId: string, 
    _dateRange: { startDate?: string; endDate?: string } | undefined, 
    ctx: TenantContext
  ): SupplierStatement {
    const supplier = db.getSupplierById(supplierId, ctx);
    if (!supplier) throw new Error(`Supplier '${supplierId}' not found`);

    const bills = db.getSupplierBills(ctx).filter((b) => b.supplierId === supplierId && b.status === 'posted');
    const payments = db.getSupplierPayments(ctx).filter((p) => p.supplierId === supplierId && p.status === 'posted');
    const creditNotes = db.getSupplierCreditNotes(ctx).filter((cn) => cn.supplierId === supplierId && cn.status === 'posted');
    const debitNotes = db.getSupplierDebitNotes(ctx).filter((dn) => dn.supplierId === supplierId && dn.status === 'posted');

    const rawTransactions: Array<{
      date: string;
      type: 'BILL' | 'PAYMENT' | 'CREDIT_NOTE' | 'DEBIT_NOTE';
      reference: string;
      memo: string;
      debitAmount: number;
      creditAmount: number;
    }> = [];

    // Supplier Bills increase AP (Credit)
    for (const b of bills) {
      rawTransactions.push({
        date: b.billDate,
        type: 'BILL',
        reference: b.billNumber,
        memo: `Supplier Invoice: ${b.supplierInvoiceNumber}`,
        debitAmount: 0,
        creditAmount: parseFloat(b.total),
      });
    }

    // Supplier Payments decrease AP (Debit)
    for (const p of payments) {
      rawTransactions.push({
        date: p.paymentDate,
        type: 'PAYMENT',
        reference: p.paymentNumber,
        memo: `Disbursement: ${p.paymentMethod.replace('_', ' ').toUpperCase()}`,
        debitAmount: parseFloat(p.amount),
        creditAmount: 0,
      });
    }

    // Credit Notes decrease AP (Debit)
    for (const cn of creditNotes) {
      rawTransactions.push({
        date: cn.date,
        type: 'CREDIT_NOTE',
        reference: cn.creditNoteNumber,
        memo: `Supplier Credit: ${cn.reason}`,
        debitAmount: parseFloat(cn.total),
        creditAmount: 0,
      });
    }

    // Debit Notes increase AP (Credit)
    for (const dn of debitNotes) {
      rawTransactions.push({
        date: dn.date,
        type: 'DEBIT_NOTE',
        reference: dn.debitNoteNumber,
        memo: `Supplier Debit: ${dn.reason}`,
        debitAmount: 0,
        creditAmount: parseFloat(dn.total),
      });
    }

    // Sort chronologically
    rawTransactions.sort((a, b) => a.date.localeCompare(b.date));

    let running = 0;
    const lines: SupplierStatementLine[] = [];

    for (let i = 0; i < rawTransactions.length; i++) {
      const tx = rawTransactions[i];
      running += (tx.creditAmount - tx.debitAmount);
      lines.push({
        id: `stmt-line-${i + 1}`,
        date: tx.date,
        type: tx.type,
        reference: tx.reference,
        memo: tx.memo,
        debit: tx.debitAmount.toFixed(4),
        credit: tx.creditAmount.toFixed(4),
        runningBalance: running.toFixed(4),
      });
    }

    return {
      supplierId: supplier.id,
      supplierName: supplier.name,
      currency: supplier.currency || ctx.baseCurrency,
      openingBalance: '0.0000',
      closingBalance: running.toFixed(4),
      lines,
    };
  }

  /**
   * Generates multi-bucket Accounts Payable Aging Schedule
   */
  public getAPAgingReport(asOfDate: string | undefined, ctx: TenantContext): APAgingReport {
    const targetDate = asOfDate || new Date().toISOString().slice(0, 10);
    const targetTime = new Date(targetDate).getTime();

    const suppliers = db.getSuppliers(ctx);
    const bills = db.getSupplierBills(ctx).filter((b) => b.status === 'posted');

    const rows: APAgingBucket[] = [];
    let curTotal = 0;
    let d30Total = 0;
    let d60Total = 0;
    let d90Total = 0;

    for (const sup of suppliers) {
      const supBills = bills.filter((b) => b.supplierId === sup.id && parseFloat(b.balanceDue) > 0);
      if (supBills.length === 0) continue;

      let bCur = 0;
      let b30 = 0;
      let b60 = 0;
      let b90 = 0;

      for (const bill of supBills) {
        const bal = parseFloat(bill.balanceDue);
        const dueTime = new Date(bill.dueDate).getTime();
        const diffDays = Math.floor((targetTime - dueTime) / (1000 * 60 * 60 * 24));

        if (diffDays <= 0) {
          bCur += bal;
        } else if (diffDays <= 30) {
          b30 += bal;
        } else if (diffDays <= 60) {
          b60 += bal;
        } else {
          b90 += bal;
        }
      }

      const rowTotal = bCur + b30 + b60 + b90;
      curTotal += bCur;
      d30Total += b30;
      d60Total += b60;
      d90Total += b90;

      rows.push({
        supplierId: sup.id,
        supplierCode: sup.code,
        supplierName: sup.name,
        currency: sup.currency || ctx.baseCurrency,
        current: bCur.toFixed(4),
        days31to60: b30.toFixed(4),
        days61to90: b60.toFixed(4),
        over90Days: b90.toFixed(4),
        totalOutstanding: rowTotal.toFixed(4),
      });
    }

    const grandTotal = curTotal + d30Total + d60Total + d90Total;

    return {
      asOfDate: targetDate,
      totalPayables: grandTotal.toFixed(4),
      buckets: {
        currentTotal: curTotal.toFixed(4),
        days31to60Total: d30Total.toFixed(4),
        days61to90Total: d60Total.toFixed(4),
        over90DaysTotal: d90Total.toFixed(4),
      },
      rows,
    };
  }

  /**
   * Posts a Supplier Payment, applies allocations against unpaid bills, and posts to General Ledger
   */
  public postSupplierPaymentWithAllocation(
    payload: {
      supplierId: string;
      paymentNumber: string;
      paymentDate: string;
      paymentMethod: PaymentMethod;
      bankAccountId: string;
      amount: string;
      currency?: string;
      exchangeRate?: string;
      reference?: string;
      notes?: string;
      allocations: DbBillPaymentAllocation[];
    },
    ctx: TenantContext
  ): DbSupplierPayment {
    const period = db.getAccountingPeriods(ctx).find(
      (p) => payload.paymentDate >= p.startDate && payload.paymentDate <= p.endDate
    );

    if (!period || period.status !== 'open') {
      throw new PeriodClosedError(period?.name || 'Period', period?.status || 'closed');
    }

    const totalAllocated = payload.allocations.reduce((sum, a) => sum + parseFloat(a.allocatedAmount), 0);
    const paymentAmount = parseFloat(payload.amount);
    const unallocated = Math.max(0, paymentAmount - totalAllocated);

    // Post to General Ledger via centralized AccountingPostingService (Dr AP #2010, Cr Bank #1010)
    const journal = accountingPostingService.post('PURCHASE_PAYMENT_DISBURSED', {
      sourceType: 'supplier_payment',
      sourceId: 'spmt-' + payload.paymentNumber,
      documentNumber: payload.paymentNumber,
      documentDate: payload.paymentDate,
      memo: `Disbursement to Supplier (Ref: ${payload.reference || payload.paymentNumber})`,
      currency: payload.currency || ctx.baseCurrency,
      exchangeRate: payload.exchangeRate || '1.000000',
      amount: payload.amount,
      subLedgerType: 'supplier',
      subLedgerEntityId: payload.supplierId,
    }, ctx);

    // Update each allocated bill's balance
    for (const alloc of payload.allocations) {
      const bill = db.getSupplierBillById(alloc.billId, ctx);
      if (bill) {
        const prevPaid = parseFloat(bill.amountPaid || '0');
        const prevBalance = parseFloat(bill.balanceDue);
        const allocAmount = parseFloat(alloc.allocatedAmount);

        const newPaid = (prevPaid + allocAmount).toFixed(4);
        const newBalance = Math.max(0, prevBalance - allocAmount).toFixed(4);

        db.updateSupplierBill(bill.id, {
          amountPaid: newPaid,
          balanceDue: newBalance,
        }, ctx);
      }
    }

    const payment = db.createSupplierPayment({
      supplierId: payload.supplierId,
      paymentNumber: payload.paymentNumber,
      paymentDate: payload.paymentDate,
      paymentMethod: payload.paymentMethod,
      bankAccountId: payload.bankAccountId,
      amount: payload.amount,
      currency: payload.currency || ctx.baseCurrency,
      exchangeRate: payload.exchangeRate || '1.000000',
      reference: payload.reference,
      notes: payload.notes,
      status: 'posted',
      journalEntryId: journal.id,
      allocations: payload.allocations,
      unallocatedAmount: unallocated.toFixed(4),
      isAdvance: unallocated > 0,
    }, ctx);

    // Record in Bank Transaction Ledger and update Bank Account Balance
    const bank = db.getBankAccountById(payload.bankAccountId, ctx) || db.getBankAccounts(ctx)[0];
    if (bank) {
      db.recordBankTransaction({
        bankAccountId: bank.id,
        transactionNumber: `TX-DISB-${payload.paymentNumber}`,
        transactionDate: payload.paymentDate,
        valueDate: payload.paymentDate,
        transactionType: 'payment',
        amount: parseFloat(payload.amount).toFixed(4),
        debitCredit: 'credit',
        currency: payload.currency || ctx.baseCurrency,
        exchangeRate: payload.exchangeRate || '1.000000',
        baseAmount: parseFloat(payload.amount).toFixed(4),
        reference: payload.reference || payload.paymentNumber,
        description: `Supplier Payment to ${payload.supplierId}`,
        sourceDocumentType: 'supplier_payment',
        sourceDocumentId: payment.id,
        sourceDocumentNumber: payload.paymentNumber,
        status: 'posted',
        journalEntryId: journal.id,
        reconciliationStatus: 'unreconciled',
      }, ctx);

      const newBal = (parseFloat(bank.currentBalance) - parseFloat(payload.amount)).toFixed(4);
      db.updateBankAccount(bank.id, { currentBalance: newBal }, ctx);
    }

    return payment;
  }
}

export const accountsPayableService = new AccountsPayableService();
