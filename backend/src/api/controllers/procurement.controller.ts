import type { Response, NextFunction } from "express";
import { db } from "../../database/storage.js";
import { procurementService } from "../../modules/procurement/services/procurement.service.js";
import { accountingPostingService } from "../../modules/accounting/services/accounting-posting.service.js";
import { buildTenantContext, type AuthenticatedRequest } from "../middleware/tenant.middleware.js";

export const procurementController = {
  getSuppliers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ctx = buildTenantContext(req);
      const suppliers = db.getSuppliers(ctx);
      res.json({ success: true, data: suppliers });
    } catch (err) {
      next(err);
    }
  },

  createSupplier(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ctx = buildTenantContext(req);
      const supplier = procurementService.createSupplier(req.body, ctx);
      res.json({ success: true, data: supplier });
    } catch (err) {
      next(err);
    }
  },

  getOrders(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ctx = buildTenantContext(req);
      const orders = db.getPurchaseOrders(ctx);
      res.json({ success: true, data: orders });
    } catch (err) {
      next(err);
    }
  },

  createOrder(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ctx = buildTenantContext(req);
      const po = db.createPurchaseOrder(req.body, ctx);
      res.json({ success: true, data: po });
    } catch (err) {
      next(err);
    }
  },

  createGRN(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ctx = buildTenantContext(req);
      const grn = db.createGoodsReceipt(req.body, ctx);
      res.json({ success: true, data: grn });
    } catch (err) {
      next(err);
    }
  },

  getBills(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ctx = buildTenantContext(req);
      const bills = db.getSupplierBills(ctx);
      res.json({ success: true, data: bills });
    } catch (err) {
      next(err);
    }
  },

  createBill(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ctx = buildTenantContext(req);
      const bill = procurementService.createSupplierBill(req.body, ctx);
      res.json({ success: true, data: bill });
    } catch (err) {
      next(err);
    }
  },

  postBill(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ctx = buildTenantContext(req);
      const bill = procurementService.postSupplierBill(String(req.params.id), ctx);
      res.json({ success: true, data: bill });
    } catch (err) {
      next(err);
    }
  },

  recordPayment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ctx = buildTenantContext(req);
      const payment = db.createSupplierPayment(req.body, ctx);
      const posted = accountingPostingService.post('PURCHASE_PAYMENT_DISBURSED', {
        sourceType: 'supplier_payment',
        sourceId: payment.id,
        documentNumber: payment.paymentNumber,
        documentDate: payment.paymentDate,
        memo: `Disbursement ${payment.paymentNumber}`,
        currency: payment.currency,
        amount: payment.amount,
        subLedgerType: 'supplier',
        subLedgerEntityId: payment.supplierId
      }, ctx);
      res.json({ success: true, data: { payment, journalEntry: posted } });
    } catch (err) {
      next(err);
    }
  }
};
