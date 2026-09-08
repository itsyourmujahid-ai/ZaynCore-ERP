import { Router } from "express";
import { salesController } from "../controllers/sales.controller.js";
import { requireTenant } from "../middleware/tenant.middleware.js";

export const salesRouter = Router();

salesRouter.use(requireTenant);
salesRouter.get("/sales/customers", salesController.getCustomers);
salesRouter.post("/sales/customers", salesController.createCustomer);
salesRouter.get("/sales/quotations", salesController.getQuotations);
salesRouter.post("/sales/quotations", salesController.createQuotation);
salesRouter.get("/sales/orders", salesController.getOrders);
salesRouter.post("/sales/quotations/:id/convert", salesController.convertQuotation);
salesRouter.get("/sales/invoices", salesController.getInvoices);
salesRouter.post("/sales/invoices", salesController.createInvoice);
salesRouter.post("/sales/invoices/:id/post", salesController.postInvoice);
salesRouter.post("/sales/payments/submit", salesController.submitPaymentRequest);
salesRouter.post("/sales/payments/:id/verify", salesController.verifyAndPostPayment);
