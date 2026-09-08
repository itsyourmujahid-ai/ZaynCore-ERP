// ============================================================================
// Accounts Receivable (AR) Sub-Ledger, Credit Control & Statement Service
// ============================================================================

import { db } from '@/database/storage';
import { TenantContext } from '@/core/types/common';
import { DbCustomerPayment, PaymentMethod } from '@/database/types';
import { accountingPostingService } from '@/modules/accounting/services/accounting-posting.service';

export interface CustomerCreditSummary {
  customerId: string;
  customerName: string;
  currency: string;
  creditLimit: string;
  totalInvoiced: string;
  totalPaid: string;
  outstandingBalance: string;
  availableCredit: string;
  overdueAmount: string;
  paymentTermsDays: number;
}

export interface StatementTransactionRow {
  date: string;
  documentType: 'Invoice' | 'Receipt' | 'Credit Note';
  documentNumber: string;
  description: string;
  debit: string;
  credit: string;
  runningBalance: string;
}

export interface CustomerStatementReport {
  customerId: string;
  customerName: string;
  currency: string;
  openingBalance: string;
  closingBalance: string;
  transactions: StatementTransactionRow[];
}

export interface ARAgingBucket {
  customerId: string;
  customerCode: string;
  customerName: string;
  current: string;     // 0 - 30 days
  days31to60: string;  // 31 - 60 days
  days61to90: string;  // 61 - 90 days
  over90Days: string;  // 90+ days
  totalOutstanding: string;
  currency: string;
}

export interface ARAgingReport {
  asOfDate: string;
  currency: string;
  totalCurrent: string;
  total31to60: string;
  total61to90: string;
  totalOver90: string;
  grandTotal: string;
  buckets: ARAgingBucket[];
}

export interface ReceiptPostingPayload {
  branchId?: string;
  receiptNumber: string;
  customerId: string;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  bankAccountId: string;
  amount: string;
  currency: string;
  exchangeRate?: string;
  reference?: string;
  notes?: string;
  proofDocumentUrl?: string;
  proofDocumentName?: string;
  allocations: Array<{
    invoiceId: string;
    invoiceNumber: string;
    allocatedAmount: string;
  }>;
}

export class AccountsReceivableService {
  /**
   * Computes dynamic real-time credit control metrics for a customer
   */
  public getCustomerCreditSummary(customerId: string, ctx: TenantContext): CustomerCreditSummary {
    const customer = db.getCustomerById(customerId, ctx);
    if (!customer) throw new Error(`Customer '${customerId}' not found`);

    const invoices = db.getSalesInvoices(ctx).filter((i) => i.customerId === customerId && i.status === 'posted');
    const creditNotes = db.getSalesCreditNotes(ctx).filter((cn) => cn.customerId === customerId && cn.status === 'posted');
    const payments = db.getCustomerPayments(ctx).filter((p) => p.customerId === customerId && p.status === 'posted');

    const totalInvoiced = invoices.reduce((sum, i) => sum + parseFloat(i.total), 0);
    const totalCreditNotes = creditNotes.reduce((sum, cn) => sum + parseFloat(cn.total), 0);
    const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

    const outstandingBalanceNum = Math.max(0, totalInvoiced - totalCreditNotes - totalPaid);
    const creditLimitNum = parseFloat(customer.creditLimit || '0');
    const availableCreditNum = Math.max(0, creditLimitNum - outstandingBalanceNum);

    // Calculate overdue amount
    const today = new Date().toISOString().slice(0, 10);
    let overdueNum = 0;
    for (const inv of invoices) {
      if (inv.dueDate < today && parseFloat(inv.balanceDue) > 0) {
        overdueNum += parseFloat(inv.balanceDue);
      }
    }

    return {
      customerId: customer.id,
      customerName: customer.name,
      currency: customer.currency || ctx.baseCurrency,
      creditLimit: creditLimitNum.toFixed(4),
      totalInvoiced: totalInvoiced.toFixed(4),
      totalPaid: totalPaid.toFixed(4),
      outstandingBalance: outstandingBalanceNum.toFixed(4),
      availableCredit: availableCreditNum.toFixed(4),
      overdueAmount: overdueNum.toFixed(4),
      paymentTermsDays: customer.paymentTermsDays,
    };
  }

  /**
   * Generates a formal Statement of Account for a customer based on actual AR transactions
   */
  public getCustomerStatement(
    customerId: string,
    dateRange?: { startDate?: string; endDate?: string },
    ctx?: TenantContext
  ): CustomerStatementReport {
    const tenantCtx = ctx || { companyId: 'c1000000-0000-0000-0000-000000000001', baseCurrency: 'USD' } as TenantContext;
    const customer = db.getCustomerById(customerId, tenantCtx);
    if (!customer) throw new Error(`Customer '${customerId}' not found`);

    const invoices = db.getSalesInvoices(tenantCtx).filter((i) => i.customerId === customerId && i.status === 'posted');
    const receipts = db.getCustomerPayments(tenantCtx).filter((p) => p.customerId === customerId && p.status === 'posted');
    const creditNotes = db.getSalesCreditNotes(tenantCtx).filter((cn) => cn.customerId === customerId && cn.status === 'posted');

    interface RawTx {
      date: string;
      docType: 'Invoice' | 'Receipt' | 'Credit Note';
      docNum: string;
      desc: string;
      debit: number;
      credit: number;
    }

    const allTx: RawTx[] = [];

    for (const inv of invoices) {
      allTx.push({
        date: inv.invoiceDate,
        docType: 'Invoice',
        docNum: inv.invoiceNumber,
        desc: `Sales Invoice ${inv.invoiceNumber}`,
        debit: parseFloat(inv.total),
        credit: 0,
      });
    }

    for (const rcpt of receipts) {
      allTx.push({
        date: rcpt.paymentDate,
        docType: 'Receipt',
        docNum: rcpt.receiptNumber,
        desc: `Payment Received (${rcpt.paymentMethod}) ${rcpt.reference || ''}`,
        debit: 0,
        credit: parseFloat(rcpt.amount),
      });
    }

    for (const cn of creditNotes) {
      allTx.push({
        date: cn.date,
        docType: 'Credit Note',
        docNum: cn.creditNoteNumber,
        desc: `Credit Note: ${cn.reason}`,
        debit: 0,
        credit: parseFloat(cn.total),
      });
    }

    allTx.sort((a, b) => a.date.localeCompare(b.date));

    let openingBal = 0;
    const filteredTx: StatementTransactionRow[] = [];
    let runningBal = 0;

    for (const tx of allTx) {
      if (dateRange?.startDate && tx.date < dateRange.startDate) {
        openingBal += tx.debit - tx.credit;
      } else if (!dateRange?.endDate || tx.date <= dateRange.endDate) {
        if (filteredTx.length === 0) runningBal = openingBal;
        runningBal += tx.debit - tx.credit;

        filteredTx.push({
          date: tx.date,
          documentType: tx.docType,
          documentNumber: tx.docNum,
          description: tx.desc,
          debit: tx.debit > 0 ? tx.debit.toFixed(4) : '0.0000',
          credit: tx.credit > 0 ? tx.credit.toFixed(4) : '0.0000',
          runningBalance: runningBal.toFixed(4),
        });
      }
    }

    return {
      customerId: customer.id,
      customerName: customer.name,
      currency: customer.currency || tenantCtx.baseCurrency,
      openingBalance: openingBal.toFixed(4),
      closingBalance: runningBal.toFixed(4),
      transactions: filteredTx,
    };
  }

  /**
   * Generates real-time Accounts Receivable (AR) Aging breakdown
   */
  public getARAgingReport(asOfDate?: string, ctx?: TenantContext): ARAgingReport {
    const tenantCtx = ctx || { companyId: 'c1000000-0000-0000-0000-000000000001', baseCurrency: 'USD' } as TenantContext;
    const targetDate = asOfDate || new Date().toISOString().slice(0, 10);
    const customers = db.getCustomers(tenantCtx);
    const invoices = db.getSalesInvoices(tenantCtx).filter((i) => i.status === 'posted');

    let grandCur = 0;
    let grand31 = 0;
    let grand61 = 0;
    let grand90 = 0;
    let grandTotal = 0;

    const buckets: ARAgingBucket[] = customers.map((c) => {
      const custInvoices = invoices.filter((i) => i.customerId === c.id && parseFloat(i.balanceDue) > 0);

      let cur = 0;
      let d31 = 0;
      let d61 = 0;
      let d90 = 0;

      for (const inv of custInvoices) {
        const dueTime = new Date(inv.dueDate).getTime();
        const asOfTime = new Date(targetDate).getTime();
        const diffDays = Math.floor((asOfTime - dueTime) / (1000 * 60 * 60 * 24));
        const balance = parseFloat(inv.balanceDue);

        if (diffDays <= 30) {
          cur += balance;
        } else if (diffDays <= 60) {
          d31 += balance;
        } else if (diffDays <= 90) {
          d61 += balance;
        } else {
          d90 += balance;
        }
      }

      const totalCust = cur + d31 + d61 + d90;

      grandCur += cur;
      grand31 += d31;
      grand61 += d61;
      grand90 += d90;
      grandTotal += totalCust;

      return {
        customerId: c.id,
        customerCode: c.code,
        customerName: c.name,
        current: cur.toFixed(4),
        days31to60: d31.toFixed(4),
        days61to90: d61.toFixed(4),
        over90Days: d90.toFixed(4),
        totalOutstanding: totalCust.toFixed(4),
        currency: c.currency || tenantCtx.baseCurrency,
      };
    });

    return {
      asOfDate: targetDate,
      currency: tenantCtx.baseCurrency,
      totalCurrent: grandCur.toFixed(4),
      total31to60: grand31.toFixed(4),
      total61to90: grand61.toFixed(4),
      totalOver90: grand90.toFixed(4),
      grandTotal: grandTotal.toFixed(4),
      buckets,
    };
  }

  /**
   * Posts customer receipt with explicit invoice allocation and customer advances
   */
  public postReceiptWithAllocation(payload: ReceiptPostingPayload, ctx: TenantContext): DbCustomerPayment {
    const profile = db.getCompanyProfile(ctx.companyId, ctx);
    if (profile?.salesWorkflow?.enablePaymentProofVerification) {
      const isAccountantOrAdmin =
        ctx.isPlatformAdmin ||
        (ctx.roles && ctx.roles.some((r) => ['admin', 'cfo', 'accountant', 'super_admin', 'superadmin', 'controller'].includes(r.toLowerCase()))) ||
        (ctx.permissions && (
          ctx.permissions.includes('accounting.payment.approve') ||
          ctx.permissions.includes('accounting.payment.finalize') ||
          ctx.permissions.includes('ar.post') ||
          ctx.permissions.includes('*')
        ));

      if (!isAccountantOrAdmin) {
        throw new Error(
          `Direct payment posting is restricted when 2-Step Payment Proof Verification is enabled. Please submit a payment request for accountant review.`
        );
      }
    }

    const customer = db.getCustomerById(payload.customerId, ctx);
    if (!customer) throw new Error(`Customer '${payload.customerId}' not found`);

    const totalReceiptAmount = parseFloat(payload.amount);
    let totalAllocated = 0;

    // Apply allocations against individual invoices
    for (const alloc of payload.allocations) {
      const allocatedVal = parseFloat(alloc.allocatedAmount);
      if (allocatedVal > 0) {
        const inv = db.getSalesInvoices(ctx).find((i) => i.id === alloc.invoiceId);
        if (inv) {
          const currentPaid = parseFloat(inv.amountPaid || '0');
          const currentBal = parseFloat(inv.balanceDue || inv.total);
          const newPaid = currentPaid + allocatedVal;
          const newBal = Math.max(0, currentBal - allocatedVal);

          db.updateSalesInvoice(inv.id, {
            amountPaid: newPaid.toFixed(4),
            balanceDue: newBal.toFixed(4),
          }, ctx);

          totalAllocated += allocatedVal;
        }
      }
    }

    const unallocatedAmountNum = Math.max(0, totalReceiptAmount - totalAllocated);

    // Post to General Ledger via centralized AccountingPostingService
    const postedJournal = accountingPostingService.post('SALES_PAYMENT_RECEIVED', {
      branchId: payload.branchId || ctx.branchId,
      sourceType: 'customer_payment',
      sourceId: payload.receiptNumber,
      documentNumber: payload.receiptNumber,
      documentDate: payload.paymentDate,
      memo: `Customer Receipt ${payload.receiptNumber} - ${customer.name}`,
      currency: payload.currency || ctx.baseCurrency,
      exchangeRate: payload.exchangeRate || '1.000000',
      amount: totalReceiptAmount.toFixed(4),
      subLedgerType: 'customer',
      subLedgerEntityId: customer.id,
    }, ctx);

    // Save Customer Payment record in storage
    const payment = db.createCustomerPayment({
      branchId: payload.branchId,
      receiptNumber: payload.receiptNumber,
      customerId: customer.id,
      paymentDate: payload.paymentDate,
      paymentMethod: payload.paymentMethod,
      bankAccountId: payload.bankAccountId || '1010',
      amount: totalReceiptAmount.toFixed(4),
      currency: payload.currency || ctx.baseCurrency,
      exchangeRate: payload.exchangeRate || '1.000000',
      reference: payload.reference,
      notes: payload.notes,
      proofDocumentUrl: payload.proofDocumentUrl,
      proofDocumentName: payload.proofDocumentName,
      submittedBy: ctx.userId,
      reviewedBy: ctx.userId,
      reviewedAt: new Date().toISOString(),
      status: 'posted',
      journalEntryId: postedJournal.id,
      allocations: payload.allocations,
      unallocatedAmount: unallocatedAmountNum.toFixed(4),
    }, ctx);

    // Record in Bank Transaction Ledger and update Bank Account Balance
    const bank = db.getBankAccountById(payload.bankAccountId, ctx) || db.getBankAccounts(ctx)[0];
    if (bank) {
      db.recordBankTransaction({
        bankAccountId: bank.id,
        transactionNumber: `TX-RCPT-${payload.receiptNumber}`,
        transactionDate: payload.paymentDate,
        valueDate: payload.paymentDate,
        transactionType: 'receipt',
        amount: totalReceiptAmount.toFixed(4),
        debitCredit: 'debit',
        currency: payload.currency || ctx.baseCurrency,
        exchangeRate: payload.exchangeRate || '1.000000',
        baseAmount: totalReceiptAmount.toFixed(4),
        reference: payload.receiptNumber,
        description: `Customer Receipt from ${customer.name}`,
        sourceDocumentType: 'customer_receipt',
        sourceDocumentId: payment.id,
        sourceDocumentNumber: payload.receiptNumber,
        counterpartyName: customer.name,
        status: 'posted',
        journalEntryId: postedJournal.id,
        reconciliationStatus: 'unreconciled',
      }, ctx);

      const newBal = (parseFloat(bank.currentBalance) + totalReceiptAmount).toFixed(4);
      db.updateBankAccount(bank.id, { currentBalance: newBal }, ctx);
    }

    return payment;
  }

  /**
   * Submits a customer payment request for accountant review (without posting to GL)
   */
  public submitPaymentRequest(payload: ReceiptPostingPayload, ctx: TenantContext): DbCustomerPayment {
    const customer = db.getCustomerById(payload.customerId, ctx);
    if (!customer) throw new Error(`Customer '${payload.customerId}' not found`);

    const totalReceiptAmount = parseFloat(payload.amount);
    const totalAllocated = payload.allocations.reduce((sum, a) => sum + (parseFloat(a.allocatedAmount) || 0), 0);
    const unallocatedAmountNum = Math.max(0, totalReceiptAmount - totalAllocated);

    return db.createCustomerPayment({
      branchId: payload.branchId,
      receiptNumber: payload.receiptNumber,
      customerId: customer.id,
      paymentDate: payload.paymentDate,
      paymentMethod: payload.paymentMethod,
      bankAccountId: payload.bankAccountId || '1010',
      amount: totalReceiptAmount.toFixed(4),
      currency: payload.currency || ctx.baseCurrency,
      exchangeRate: payload.exchangeRate || '1.000000',
      reference: payload.reference,
      notes: payload.notes,
      proofDocumentUrl: payload.proofDocumentUrl,
      proofDocumentName: payload.proofDocumentName,
      submittedBy: ctx.userId,
      status: 'pending_approval',
      allocations: payload.allocations,
      unallocatedAmount: unallocatedAmountNum.toFixed(4),
    }, ctx);
  }

  /**
   * Accountant verifies customer payment, approves, posts GL double-entry, and updates AR balances
   */
  public approveAndPostPayment(paymentId: string, ctx: TenantContext): DbCustomerPayment {
    const payments = db.getCustomerPayments(ctx);
    const payment = payments.find((p) => p.id === paymentId);
    if (!payment) throw new Error(`Payment '${paymentId}' not found`);

    if (payment.status === 'posted') {
      throw new Error(`Payment '${payment.receiptNumber}' is already posted.`);
    }

    const customer = db.getCustomerById(payment.customerId, ctx);
    if (!customer) throw new Error(`Customer '${payment.customerId}' not found`);

    const totalReceiptAmount = parseFloat(payment.amount);
    let totalAllocated = 0;

    // Apply allocations against individual invoices
    for (const alloc of payment.allocations) {
      const allocatedVal = parseFloat(alloc.allocatedAmount);
      if (allocatedVal > 0) {
        const inv = db.getSalesInvoices(ctx).find((i) => i.id === alloc.invoiceId);
        if (inv) {
          const currentPaid = parseFloat(inv.amountPaid || '0');
          const currentBal = parseFloat(inv.balanceDue || inv.total);
          const newPaid = currentPaid + allocatedVal;
          const newBal = Math.max(0, currentBal - allocatedVal);

          db.updateSalesInvoice(inv.id, {
            amountPaid: newPaid.toFixed(4),
            balanceDue: newBal.toFixed(4),
          }, ctx);

          totalAllocated += allocatedVal;
        }
      }
    }

    // Post to General Ledger via centralized AccountingPostingService
    const postedJournal = accountingPostingService.post('SALES_PAYMENT_RECEIVED', {
      branchId: payment.branchId || ctx.branchId,
      sourceType: 'customer_payment',
      sourceId: payment.receiptNumber,
      documentNumber: payment.receiptNumber,
      documentDate: payment.paymentDate,
      memo: `Customer Receipt ${payment.receiptNumber} - ${customer.name}`,
      currency: payment.currency || ctx.baseCurrency,
      exchangeRate: payment.exchangeRate || '1.000000',
      amount: totalReceiptAmount.toFixed(4),
      subLedgerType: 'customer',
      subLedgerEntityId: customer.id,
    }, ctx);

    // Update payment record to posted
    const updated = db.updateCustomerPayment(payment.id, {
      status: 'posted',
      journalEntryId: postedJournal.id,
      reviewedBy: ctx.userId,
      reviewedAt: new Date().toISOString(),
      approvedBy: ctx.userId,
      approvedAt: new Date().toISOString(),
    }, ctx);

    // Record in Bank Transaction Ledger and update Bank Account Balance
    const bank = db.getBankAccountById(payment.bankAccountId, ctx) || db.getBankAccounts(ctx)[0];
    if (bank) {
      db.recordBankTransaction({
        bankAccountId: bank.id,
        transactionNumber: `TX-RCPT-${payment.receiptNumber}`,
        transactionDate: payment.paymentDate,
        valueDate: payment.paymentDate,
        transactionType: 'receipt',
        amount: totalReceiptAmount.toFixed(4),
        debitCredit: 'debit',
        currency: payment.currency || ctx.baseCurrency,
        exchangeRate: payment.exchangeRate || '1.000000',
        baseAmount: totalReceiptAmount.toFixed(4),
        reference: payment.receiptNumber,
        description: `Customer Receipt from ${customer.name}`,
        sourceDocumentType: 'customer_receipt',
        sourceDocumentId: payment.id,
        sourceDocumentNumber: payment.receiptNumber,
        counterpartyName: customer.name,
        status: 'posted',
        journalEntryId: postedJournal.id,
        reconciliationStatus: 'unreconciled',
      }, ctx);

      const newBal = (parseFloat(bank.currentBalance) + totalReceiptAmount).toFixed(4);
      db.updateBankAccount(bank.id, { currentBalance: newBal }, ctx);
    }

    return updated;
  }

  /**
   * Accountant rejects payment with reason; payment returns to rejected state without posting
   */
  public rejectPayment(paymentId: string, reason: string, ctx: TenantContext): DbCustomerPayment {
    const payment = db.getCustomerPayments(ctx).find((p) => p.id === paymentId);
    if (!payment) throw new Error(`Payment '${paymentId}' not found`);

    if (payment.status === 'posted') {
      throw new Error(`Cannot reject already posted payment '${payment.receiptNumber}'`);
    }

    return db.updateCustomerPayment(payment.id, {
      status: 'rejected',
      rejectionReason: reason,
      reviewedBy: ctx.userId,
      reviewedAt: new Date().toISOString(),
    }, ctx);
  }

  /**
   * Sales user corrects proof or details and resubmits rejected payment
   */
  public resubmitPayment(paymentId: string, payload: Partial<ReceiptPostingPayload>, ctx: TenantContext): DbCustomerPayment {
    const payment = db.getCustomerPayments(ctx).find((p) => p.id === paymentId);
    if (!payment) throw new Error(`Payment '${paymentId}' not found`);

    return db.updateCustomerPayment(payment.id, {
      ...payload,
      status: 'pending_approval',
      rejectionReason: undefined,
      submittedBy: ctx.userId,
    }, ctx);
  }
}

export const accountsReceivableService = new AccountsReceivableService();
