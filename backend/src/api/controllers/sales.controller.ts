import type { Response, NextFunction } from "express";
import { db } from "../../database/storage.js";
import { salesService } from "../../modules/sales/services/sales.service.js";
import { accountingPostingService } from "../../modules/accounting/services/accounting-posting.service.js";
import { buildTenantContext, type AuthenticatedRequest } from "../middleware/tenant.middleware.js";

export const salesController = {
  getCustomers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ctx = buildTenantContext(req);
      const customers = db.getCustomers(ctx);
      res.json({ success: true, data: customers });
    } catch (err) {
      next(err);
    }
  },

  createCustomer(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ctx = buildTenantContext(req);
      const customer = salesService.createCustomer(req.body, ctx);
      res.json({ success: true, data: customer });
    } catch (err) {
      next(err);
    }
  },

  getQuotations(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ctx = buildTenantContext(req);
      const quotes = db.getSalesQuotations(ctx);
      res.json({ success: true, data: quotes });
    } catch (err) {
      next(err);
    }
  },

  createQuotation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ctx = buildTenantContext(req);
      const quote = salesService.createQuotation(req.body, ctx);
      res.json({ success: true, data: quote });
    } catch (err) {
      next(err);
    }
  },

  getOrders(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ctx = buildTenantContext(req);
      const orders = db.getSalesOrders(ctx);
      res.json({ success: true, data: orders });
    } catch (err) {
      next(err);
    }
  },

  convertQuotation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ctx = buildTenantContext(req);
      const order = salesService.convertQuotationToOrder(String(req.params.id), ctx);
      res.json({ success: true, data: order });
    } catch (err) {
      next(err);
    }
  },

  getInvoices(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ctx = buildTenantContext(req);
      const invoices = db.getSalesInvoices(ctx);
      res.json({ success: true, data: invoices });
    } catch (err) {
      next(err);
    }
  },

  createInvoice(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ctx = buildTenantContext(req);
      const invoice = salesService.createInvoice(req.body, ctx);
      res.json({ success: true, data: invoice });
    } catch (err) {
      next(err);
    }
  },

  postInvoice(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ctx = buildTenantContext(req);
      const invoice = salesService.postInvoice(String(req.params.id), ctx);
      res.json({ success: true, data: invoice });
    } catch (err) {
      next(err);
    }
  },

  submitPaymentRequest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ctx = buildTenantContext(req);
      const payment = db.createCustomerPayment({
        receiptNumber: `RCP-${Date.now().toString().slice(-6)}`,
        customerId: req.body.customerId,
        paymentDate: req.body.paymentDate || new Date().toISOString().slice(0, 10),
        amount: req.body.amount,
        currency: req.body.currency || 'USD',
        exchangeRate: req.body.exchangeRate || '1.0000',
        bankAccountId: req.body.bankAccountId || 'ba-default',
        paymentMethod: req.body.paymentMethod || 'bank_transfer',
        reference: req.body.reference || 'PAY-REF',
        status: 'pending_approval',
        proofDocumentUrl: req.body.proofDocumentUrl || 'https://storage.enterprise-erp.internal/proof.pdf',
        
        allocations: req.body.allocations || [], unallocatedAmount: req.body.unallocatedAmount || '0.0000'
      }, ctx);
      res.json({ success: true, data: payment });
    } catch (err) {
      next(err);
    }
  },

  verifyAndPostPayment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ctx = buildTenantContext(req);
      const payment = db.getCustomerPayments(ctx).find((p) => p.id === req.params.id);
      if (!payment) {
        return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Payment not found" } });
      }
      
      const posted = accountingPostingService.post('SALES_PAYMENT_RECEIVED', {
        sourceType: 'customer_payment',
        sourceId: payment.id,
        documentNumber: payment.receiptNumber,
        documentDate: payment.paymentDate,
        memo: `Receipt ${payment.receiptNumber} from Customer ${payment.customerId}`,
        currency: payment.currency,
        amount: payment.amount,
        subLedgerType: 'customer',
        subLedgerEntityId: payment.customerId
      }, ctx);

      db.updateCustomerPayment(payment.id, { status: 'posted', journalEntryId: posted.id }, ctx);
      res.json({ success: true, data: { payment, journalEntry: posted } });
    } catch (err) {
      next(err);
    }
  }
};


