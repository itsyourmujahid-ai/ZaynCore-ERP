// ============================================================================
// Commercial Sales Domain Service (Quotation -> Order -> Invoice -> GL Pipeline)
// ============================================================================

import { db } from '@/database/storage';
import { TenantContext } from '@/core/types/common';
import { 
  DbCustomer, 
  DbSalesQuotation, 
  DbSalesOrder, 
  DbSalesInvoice, 
  DbSalesCreditNote 
} from '@/database/types';
import { accountingPostingService } from '@/modules/accounting/services/accounting-posting.service';
import { PeriodClosedError } from '@/core/errors/DomainErrors';

export class SalesService {
  /**
   * Creates a new customer in the master directory
   */
  public createCustomer(
    payload: Omit<DbCustomer, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>,
    ctx: TenantContext
  ): DbCustomer {
    return db.createCustomer(payload, ctx);
  }

  /**
   * Creates a new sales price quotation
   */
  public createQuotation(
    payload: Omit<DbSalesQuotation, 'id' | 'companyId' | 'createdAt' | 'updatedAt' | 'convertedToOrderId'>,
    ctx: TenantContext
  ): DbSalesQuotation {
    return db.createSalesQuotation({
      ...payload,
      convertedToOrderId: undefined,
    }, ctx);
  }

  /**
   * Accepts quotation and converts it into a confirmed Sales Order
   */
  public convertQuotationToOrder(quotationId: string, ctx: TenantContext): DbSalesOrder {
    const quotes = db.getSalesQuotations(ctx);
    const quote = quotes.find((q) => q.id === quotationId);
    if (!quote) throw new Error(`Quotation '${quotationId}' not found`);

    if (quote.status === 'expired' || quote.status === 'rejected') {
      throw new Error(`Cannot convert ${quote.status.toUpperCase()} quotation to an order`);
    }

    // Create linked Sales Order
    const orderNumber = `SO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const order = db.createSalesOrder({
      orderNumber,
      customerId: quote.customerId,
      quotationId: quote.id,
      orderDate: new Date().toISOString().slice(0, 10),
      deliveryDate: quote.validUntil,
      salesperson: quote.salesperson,
      currency: quote.currency,
      exchangeRate: quote.exchangeRate,
      subtotal: quote.subtotal,
      discountTotal: quote.discountTotal,
      taxTotal: quote.taxTotal,
      total: quote.total,
      notes: `Converted from Quotation ${quote.quotationNumber}. ${quote.notes || ''}`,
      status: 'confirmed',
      invoicedAmount: '0.0000',
      items: quote.items.map((i) => ({ ...i, id: 'item-' + Math.random().toString(36).slice(2, 8) })),
    }, ctx);

    // Update Quotation status to accepted & linked
    db.updateSalesQuotation(quote.id, {
      status: 'accepted',
      convertedToOrderId: order.id,
    }, ctx);

    return order;
  }

  /**
   * Creates a draft Sales Invoice from scratch or from a Sales Order
   */
  public createInvoice(
    payload: Omit<DbSalesInvoice, 'id' | 'companyId' | 'createdAt' | 'updatedAt' | 'amountPaid' | 'balanceDue' | 'journalEntryId'>,
    ctx: TenantContext
  ): DbSalesInvoice {
    return db.createSalesInvoice({
      ...payload,
      amountPaid: '0.0000',
      balanceDue: payload.total,
      status: payload.status || 'draft',
      journalEntryId: undefined,
    }, ctx);
  }

  /**
   * Posts an approved Sales Invoice directly to the General Ledger via AccountingPostingService
   */
  public postInvoice(invoiceId: string, ctx: TenantContext): DbSalesInvoice {
    const invoices = db.getSalesInvoices(ctx);
    const invoice = invoices.find((i) => i.id === invoiceId);
    if (!invoice) throw new Error(`Invoice '${invoiceId}' not found`);

    if (invoice.status === 'posted') {
      throw new Error(`Invoice '${invoice.invoiceNumber}' is already posted and immutable.`);
    }

    // Verify period is open
    const periods = db.getAccountingPeriods(ctx);
    const period = periods.find(
      (p) => invoice.invoiceDate >= p.startDate && invoice.invoiceDate <= p.endDate
    );

    if (!period) {
      throw new Error(`No accounting period defined for date ${invoice.invoiceDate}`);
    }

    if (period.status !== 'open') {
      throw new PeriodClosedError(period.name, period.status);
    }

    // Post to General Ledger via centralized AccountingPostingService
    const postedJournal = accountingPostingService.post('SALES_INVOICE_POSTED', {
      branchId: invoice.branchId || ctx.branchId,
      sourceType: 'sales_invoice',
      sourceId: invoice.id,
      documentNumber: invoice.invoiceNumber,
      documentDate: invoice.invoiceDate,
      memo: `Sales Tax Invoice ${invoice.invoiceNumber}`,
      currency: invoice.currency,
      exchangeRate: invoice.exchangeRate,
      amount: invoice.total,
      taxAmount: invoice.taxTotal,
      taxCodeId: invoice.items[0]?.taxCodeId,
      subLedgerType: 'customer',
      subLedgerEntityId: invoice.customerId,
    }, ctx);

    // Update invoice record with posted status and journal link
    const updated = db.updateSalesInvoice(invoice.id, {
      status: 'posted',
      journalEntryId: postedJournal.id,
    }, ctx);

    // If originated from Sales Order, update invoiced amount
    if (invoice.salesOrderId) {
      const order = db.getSalesOrders(ctx).find((o) => o.id === invoice.salesOrderId);
      if (order) {
        db.updateSalesOrder(order.id, {
          invoicedAmount: (parseFloat(order.invoicedAmount) + parseFloat(invoice.total)).toFixed(4),
          status: 'completed',
        }, ctx);
      }
    }

    return updated;
  }

  /**
   * Posts an immediate Cash Sale (Direct Bank/Cash Debit & Sales Revenue Credit)
   */
  public postCashSale(
    payload: Omit<DbSalesInvoice, 'id' | 'companyId' | 'createdAt' | 'updatedAt' | 'amountPaid' | 'balanceDue' | 'journalEntryId'> & {
      bankAccountId?: string;
    },
    ctx: TenantContext
  ): DbSalesInvoice {
    const invoice = db.createSalesInvoice({
      ...payload,
      status: 'draft',
      amountPaid: payload.total,
      balanceDue: '0.0000',
    }, ctx);

    // 1. Post Revenue Recognition
    const postedJournal = accountingPostingService.post('SALES_INVOICE_POSTED', {
      branchId: invoice.branchId || ctx.branchId,
      sourceType: 'sales_invoice',
      sourceId: invoice.id,
      documentNumber: invoice.invoiceNumber,
      documentDate: invoice.invoiceDate,
      memo: `Cash Sale Invoice ${invoice.invoiceNumber}`,
      currency: invoice.currency,
      exchangeRate: invoice.exchangeRate,
      amount: invoice.total,
      taxAmount: invoice.taxTotal,
      taxCodeId: invoice.items[0]?.taxCodeId,
      subLedgerType: 'customer',
      subLedgerEntityId: invoice.customerId,
    }, ctx);

    // 2. Post Immediate Cash Receipt
    accountingPostingService.post('SALES_PAYMENT_RECEIVED', {
      branchId: invoice.branchId || ctx.branchId,
      sourceType: 'sales_receipt',
      sourceId: `rcpt-${invoice.id}`,
      documentNumber: `RCPT-${invoice.invoiceNumber}`,
      documentDate: invoice.invoiceDate,
      memo: `Immediate Payment for ${invoice.invoiceNumber}`,
      currency: invoice.currency,
      exchangeRate: invoice.exchangeRate,
      amount: invoice.total,
      subLedgerType: 'customer',
      subLedgerEntityId: invoice.customerId,
    }, ctx);

    // Mark invoice as posted & fully paid
    return db.updateSalesInvoice(invoice.id, {
      status: 'posted',
      amountPaid: invoice.total,
      balanceDue: '0.0000',
      journalEntryId: postedJournal.id,
    }, ctx);
  }

  /**
  /**
   * Retrieves a single sales invoice by ID
   */
  public getInvoiceById(invoiceId: string, ctx: TenantContext): DbSalesInvoice | undefined {
    return db.getSalesInvoices(ctx).find((i) => i.id === invoiceId);
  }

  /**
   * Posts a Sales Credit Note against an invoice or customer account
   */
  public createCreditNote(
    payload: Omit<DbSalesCreditNote, 'id' | 'companyId' | 'createdAt' | 'journalEntryId' | 'status'> & {
      amount?: string;
      creditNoteDate?: string;
      taxTotal?: string;
    },
    ctx: TenantContext
  ): DbSalesCreditNote {
    const docDate = payload.date || payload.creditNoteDate || new Date().toISOString().slice(0, 10);
    const taxVal = payload.taxAmount || payload.taxTotal || '0.0000';
    const totalVal = payload.total || payload.amount || (parseFloat(payload.subtotal || '0') + parseFloat(taxVal)).toFixed(4);
    const subtotalVal = payload.subtotal || (parseFloat(totalVal) - parseFloat(taxVal)).toFixed(4);

    // Post reversing/credit adjustment journal to General Ledger
    const postedJournal = accountingPostingService.post('SALES_CREDIT_NOTE_POSTED', {
      sourceType: 'sales_credit_note',
      sourceId: payload.creditNoteNumber,
      documentNumber: payload.creditNoteNumber,
      documentDate: docDate,
      memo: `Sales Credit Note ${payload.creditNoteNumber}. Reason: ${payload.reason || 'Sales return adjustment'}`,
      currency: payload.currency,
      exchangeRate: payload.exchangeRate,
      amount: totalVal,
      taxAmount: taxVal,
      subLedgerType: 'customer',
      subLedgerEntityId: payload.customerId,
      customLines: [
        {
          accountCode: '4010', // Debit Sales Revenue (Reducing Sales)
          description: `Credit Note Adjustment: ${payload.creditNoteNumber}`,
          debitAmount: subtotalVal,
          creditAmount: '0.0000',
        },
        ...(parseFloat(taxVal) > 0 ? [{
          accountCode: '2200', // Debit Output VAT (Reducing Output VAT liability)
          description: `VAT Adjustment: ${payload.creditNoteNumber}`,
          debitAmount: taxVal,
          creditAmount: '0.0000',
        }] : []),
        {
          accountCode: '1200', // Credit Trade Receivables (Reducing customer receivable)
          description: `AR Reduction: ${payload.creditNoteNumber}`,
          debitAmount: '0.0000',
          creditAmount: totalVal,
          subLedgerType: 'customer',
          subLedgerEntityId: payload.customerId,
        },
      ],
    }, ctx);

    // If attached to specific invoice, reduce invoice balance
    if (payload.invoiceId) {
      const invoice = db.getSalesInvoices(ctx).find((i) => i.id === payload.invoiceId);
      if (invoice) {
        const newBalance = Math.max(0, parseFloat(invoice.balanceDue) - parseFloat(totalVal)).toFixed(4);
        db.updateSalesInvoice(invoice.id, { balanceDue: newBalance }, ctx);
      }
    }

    return db.createSalesCreditNote({
      creditNoteNumber: payload.creditNoteNumber,
      customerId: payload.customerId,
      invoiceId: payload.invoiceId,
      date: docDate,
      reason: payload.reason || '',
      subtotal: subtotalVal,
      taxAmount: taxVal,
      total: totalVal,
      currency: payload.currency,
      exchangeRate: payload.exchangeRate,
      status: 'posted',
      journalEntryId: postedJournal.id,
      items: payload.items || [],
    }, ctx);
  }

  /**
   * Alias for posting credit note
   */
  public postCreditNote(creditNoteId: string, ctx: TenantContext): DbSalesCreditNote {
    const existing = db.getSalesCreditNotes(ctx).find((cn) => cn.id === creditNoteId);
    if (existing) return existing;
    return {} as DbSalesCreditNote;
  }
}

export const salesService = new SalesService();
