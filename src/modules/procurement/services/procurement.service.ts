// ============================================================================
// Procurement & Supply Chain Domain Service (PR -> RFQ -> PO -> GR -> Bill -> GL)
// ============================================================================

import { db } from '@/database/storage';
import { TenantContext } from '@/core/types/common';
import { 
  DbSupplier, 
  DbPurchaseRequest, 
  DbRFQ, 
  DbSupplierQuotation, 
  DbPurchaseOrder, 
  DbGoodsReceipt, 
  DbSupplierBill, 
  DbSupplierCreditNote, 
  DbSupplierDebitNote,
  MatchStatus
} from '@/database/types';
import { accountingPostingService } from '@/modules/accounting/services/accounting-posting.service';
import { PeriodClosedError, ImmutableRecordError } from '@/core/errors/DomainErrors';

export interface ThreeWayMatchResult {
  matchStatus: MatchStatus;
  poMatched: boolean;
  receiptMatched: boolean;
  qtyVariance: string;
  priceVariance: string;
  totalVariance: string;
  toleranceExceeded: boolean;
}

export class ProcurementService {
  /**
   * Registers a new supplier in the directory
   */
  public createSupplier(
    payload: Omit<DbSupplier, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>,
    ctx: TenantContext
  ): DbSupplier {
    return db.createSupplier(payload, ctx);
  }

  /**
   * Creates a purchase requisition from internal employees/departments
   */
  public createPurchaseRequest(
    payload: Omit<DbPurchaseRequest, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>,
    ctx: TenantContext
  ): DbPurchaseRequest {
    return db.createPurchaseRequest(payload, ctx);
  }

  /**
   * Submits a purchase requisition for workflow approval
   */
  public submitPurchaseRequest(requestId: string, ctx: TenantContext): DbPurchaseRequest {
    const pr = db.getPurchaseRequestById(requestId, ctx);
    if (!pr) throw new Error(`Purchase Request '${requestId}' not found`);
    return db.updatePurchaseRequest(requestId, { status: 'submitted' }, ctx);
  }

  /**
   * Approves a purchase requisition
   */
  public approvePurchaseRequest(requestId: string, comments: string | undefined, ctx: TenantContext): DbPurchaseRequest {
    const pr = db.getPurchaseRequestById(requestId, ctx);
    if (!pr) throw new Error(`Purchase Request '${requestId}' not found`);

    return db.updatePurchaseRequest(requestId, {
      status: 'approved',
      approvedById: ctx.userId || 'system-approver',
      approvedAt: new Date().toISOString(),
      approvalComments: comments || 'Approved for procurement',
    }, ctx);
  }

  /**
   * Rejects a purchase requisition
   */
  public rejectPurchaseRequest(requestId: string, comments: string, ctx: TenantContext): DbPurchaseRequest {
    const pr = db.getPurchaseRequestById(requestId, ctx);
    if (!pr) throw new Error(`Purchase Request '${requestId}' not found`);

    return db.updatePurchaseRequest(requestId, {
      status: 'rejected',
      approvalComments: comments,
    }, ctx);
  }

  /**
   * Creates an RFQ to solicit quotes from suppliers
   */
  public createRFQ(
    payload: Omit<DbRFQ, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>,
    ctx: TenantContext
  ): DbRFQ {
    return db.createRFQ(payload, ctx);
  }

  /**
   * Records a quote from a supplier against an RFQ
   */
  public recordSupplierQuotation(
    payload: Omit<DbSupplierQuotation, 'id' | 'companyId' | 'createdAt'>,
    ctx: TenantContext
  ): DbSupplierQuotation {
    return db.createSupplierQuotation(payload, ctx);
  }

  /**
   * Selects winning quotation after side-by-side comparison
   */
  public selectWinningQuotation(
    rfqId: string, 
    quotationId: string, 
    reason: string, 
    ctx: TenantContext
  ): DbSupplierQuotation {
    const quotes = db.getSupplierQuotations(ctx).filter((q) => q.rfqId === rfqId);
    for (const q of quotes) {
      db.updateSupplierQuotation(q.id, { isSelected: q.id === quotationId, selectionReason: q.id === quotationId ? reason : undefined }, ctx);
    }
    db.updateRFQ(rfqId, { status: 'completed' }, ctx);
    const selected = db.getSupplierQuotationById(quotationId, ctx);
    if (!selected) throw new Error(`Quotation '${quotationId}' not found`);
    return selected;
  }

  /**
   * Creates an official Purchase Order
   */
  public createPurchaseOrder(
    payload: Omit<DbPurchaseOrder, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>,
    ctx: TenantContext
  ): DbPurchaseOrder {
    return db.createPurchaseOrder(payload, ctx);
  }

  /**
   * Approves a Purchase Order
   */
  public approvePurchaseOrder(poId: string, ctx: TenantContext): DbPurchaseOrder {
    const po = db.getPurchaseOrderById(poId, ctx);
    if (!po) throw new Error(`Purchase Order '${poId}' not found`);
    return db.updatePurchaseOrder(poId, {
      status: 'approved',
      approvedById: ctx.userId,
      approvedAt: new Date().toISOString(),
    }, ctx);
  }

  /**
   * Receives goods/services against a Purchase Order
   */
  public receiveGoods(
    payload: Omit<DbGoodsReceipt, 'id' | 'companyId' | 'createdAt'>,
    ctx: TenantContext
  ): DbGoodsReceipt {
    const po = db.getPurchaseOrderById(payload.purchaseOrderId, ctx);
    if (!po) throw new Error(`Purchase Order '${payload.purchaseOrderId}' not found`);

    const receipt = db.createGoodsReceipt(payload, ctx);

    // Update PO item received quantities
    const updatedItems = po.items.map((item) => {
      const receiptItem = payload.items.find((ri) => ri.poItemId === item.id);
      if (receiptItem) {
        const prevReceived = parseFloat(item.receivedQuantity || '0');
        const newlyReceived = parseFloat(receiptItem.acceptedQuantity || '0');
        return {
          ...item,
          receivedQuantity: (prevReceived + newlyReceived).toFixed(4),
        };
      }
      return item;
    });

    const isFullyReceived = updatedItems.every(
      (item) => parseFloat(item.receivedQuantity) >= parseFloat(item.quantity)
    );

    db.updatePurchaseOrder(po.id, {
      items: updatedItems,
      status: isFullyReceived ? 'fully_received' : 'partially_received',
    }, ctx);

    return receipt;
  }

  /**
   * Evaluates 3-Way Match between PO, Goods Receipt, and Supplier Bill
   */
  public evaluate3WayMatch(
    billItems: Array<{ poItemId?: string; quantity: string; unitPrice: string; total: string }>,
    poId: string | undefined,
    goodsReceiptId: string | undefined,
    ctx: TenantContext
  ): ThreeWayMatchResult {
    if (!poId) {
      return {
        matchStatus: 'matched',
        poMatched: false,
        receiptMatched: false,
        qtyVariance: '0.0000',
        priceVariance: '0.0000',
        totalVariance: '0.0000',
        toleranceExceeded: false,
      };
    }

    const po = db.getPurchaseOrderById(poId, ctx);
    if (!po) {
      return {
        matchStatus: 'mismatch',
        poMatched: false,
        receiptMatched: false,
        qtyVariance: '0.0000',
        priceVariance: '0.0000',
        totalVariance: '0.0000',
        toleranceExceeded: true,
      };
    }

    let totalQtyDiff = 0;
    let totalPriceDiff = 0;
    let toleranceExceeded = false;

    for (const bItem of billItems) {
      const poItem = po.items.find((pi) => pi.id === bItem.poItemId) || po.items[0];
      if (poItem) {
        const poQty = parseFloat(poItem.quantity);
        const billQty = parseFloat(bItem.quantity);
        const poPrice = parseFloat(poItem.unitPrice);
        const billPrice = parseFloat(bItem.unitPrice);

        const qtyVariancePct = poQty > 0 ? Math.abs((billQty - poQty) / poQty) * 100 : 0;
        const priceVariancePct = poPrice > 0 ? Math.abs((billPrice - poPrice) / poPrice) * 100 : 0;

        totalQtyDiff += Math.abs(billQty - poQty);
        totalPriceDiff += Math.abs(billPrice - poPrice);

        // 5% Tolerance threshold
        if (qtyVariancePct > 5.0 || priceVariancePct > 5.0) {
          toleranceExceeded = true;
        }
      }
    }

    const matchStatus: MatchStatus = toleranceExceeded 
      ? 'mismatch' 
      : (totalQtyDiff > 0 || totalPriceDiff > 0) 
      ? 'partially_matched' 
      : 'matched';

    return {
      matchStatus,
      poMatched: true,
      receiptMatched: !!goodsReceiptId,
      qtyVariance: totalQtyDiff.toFixed(4),
      priceVariance: totalPriceDiff.toFixed(4),
      totalVariance: (totalPriceDiff * totalQtyDiff).toFixed(4),
      toleranceExceeded,
    };
  }

  /**
   * Creates a supplier bill with automatic 3-Way Match calculation
   */
  public createSupplierBill(
    payload: Omit<DbSupplierBill, 'id' | 'companyId' | 'createdAt' | 'updatedAt' | 'amountPaid' | 'balanceDue' | 'freightTotal' | 'supplierInvoiceNumber' | 'matchStatus'> & {
      amountPaid?: string;
      balanceDue?: string;
      freightTotal?: string;
      supplierInvoiceNumber?: string;
      matchStatus?: MatchStatus;
    },
    ctx: TenantContext
  ): DbSupplierBill {
    const match = this.evaluate3WayMatch(payload.items, payload.purchaseOrderId, payload.goodsReceiptId, ctx);

    return db.createSupplierBill({
      ...payload,
      matchStatus: match.matchStatus,
      matchDetails: match,
    }, ctx);
  }

  /**
   * Posts an approved Supplier Bill to General Ledger and AP Sub-Ledger
   */
  public postSupplierBill(billId: string, ctx: TenantContext): DbSupplierBill {
    const bill = db.getSupplierBillById(billId, ctx);
    if (!bill) throw new Error(`Supplier bill '${billId}' not found`);

    if (bill.status === 'posted') {
      throw new ImmutableRecordError('SupplierBill', billId);
    }

    // Verify accounting period is open for billDate
    const periods = db.getAccountingPeriods(ctx);
    const period = periods.find(
      (p) => bill.billDate >= p.startDate && bill.billDate <= p.endDate
    );

    if (!period) {
      throw new Error(`No accounting period defined for date ${bill.billDate}`);
    }

    if (period.status !== 'open') {
      throw new PeriodClosedError(period.name, period.status);
    }

    // Post to General Ledger via centralized AccountingPostingService
    const journal = accountingPostingService.post('PURCHASE_BILL_POSTED', {
      branchId: bill.branchId,
      sourceType: 'supplier_bill',
      sourceId: bill.id,
      documentNumber: bill.billNumber,
      documentDate: bill.billDate,
      memo: `Supplier Bill: ${bill.supplierInvoiceNumber}`,
      currency: bill.currency,
      exchangeRate: bill.exchangeRate,
      amount: bill.total,
      taxAmount: bill.taxTotal,
      taxCodeId: bill.items[0]?.taxCodeId,
      subLedgerType: 'supplier',
      subLedgerEntityId: bill.supplierId,
    }, ctx);

    // Update bill to posted state
    const updated = db.updateSupplierBill(bill.id, {
      status: 'posted',
      journalEntryId: journal.id,
    }, ctx);

    return updated;
  }

  /**
   * Issues a supplier credit note (return/discount adjustment)
   */
  public createCreditNote(
    payload: Omit<DbSupplierCreditNote, 'id' | 'companyId' | 'createdAt' | 'status' | 'journalEntryId'>,
    ctx: TenantContext
  ): DbSupplierCreditNote {
    const period = db.getAccountingPeriods(ctx).find(
      (p) => payload.date >= p.startDate && payload.date <= p.endDate
    );

    if (!period || period.status !== 'open') {
      throw new PeriodClosedError(period?.name || 'Period', period?.status || 'closed');
    }

    const journal = accountingPostingService.post('PURCHASE_DEBIT_NOTE_POSTED', {
      sourceType: 'supplier_credit_note',
      sourceId: 'cn-' + payload.creditNoteNumber,
      documentNumber: payload.creditNoteNumber,
      documentDate: payload.date,
      memo: `Supplier Credit Note: ${payload.reason}`,
      currency: payload.currency,
      exchangeRate: payload.exchangeRate,
      amount: payload.total,
      taxAmount: payload.taxAmount,
      subLedgerType: 'supplier',
      subLedgerEntityId: payload.supplierId,
    }, ctx);

    const creditNote = db.createSupplierCreditNote({
      ...payload,
      status: 'posted',
      journalEntryId: journal.id,
    }, ctx);

    // Reduce linked bill balance if referenced
    if (payload.billId) {
      const bill = db.getSupplierBillById(payload.billId, ctx);
      if (bill) {
        const currentBal = parseFloat(bill.balanceDue);
        const cnAmount = parseFloat(payload.total);
        const newBal = Math.max(0, currentBal - cnAmount).toFixed(4);
        db.updateSupplierBill(bill.id, { balanceDue: newBal }, ctx);
      }
    }

    return creditNote;
  }

  /**
   * Issues a supplier debit note
   */
  public createDebitNote(
    payload: Omit<DbSupplierDebitNote, 'id' | 'companyId' | 'createdAt' | 'status' | 'journalEntryId'>,
    ctx: TenantContext
  ): DbSupplierDebitNote {
    const journal = accountingPostingService.post('PURCHASE_DEBIT_NOTE_POSTED', {
      sourceType: 'supplier_debit_note',
      sourceId: 'dn-' + payload.debitNoteNumber,
      documentNumber: payload.debitNoteNumber,
      documentDate: payload.date,
      memo: `Supplier Debit Note: ${payload.reason}`,
      currency: payload.currency,
      exchangeRate: payload.exchangeRate,
      amount: payload.total,
      taxAmount: payload.taxAmount,
      subLedgerType: 'supplier',
      subLedgerEntityId: payload.supplierId,
    }, ctx);

    return db.createSupplierDebitNote({
      ...payload,
      status: 'posted',
      journalEntryId: journal.id,
    }, ctx);
  }
}

export const procurementService = new ProcurementService();
