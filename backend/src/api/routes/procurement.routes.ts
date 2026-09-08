import { Router } from "express";
import { procurementController } from "../controllers/procurement.controller.js";
import { requireTenant } from "../middleware/tenant.middleware.js";

export const procurementRouter = Router();

procurementRouter.use(requireTenant);
procurementRouter.get("/procurement/suppliers", procurementController.getSuppliers);
procurementRouter.post("/procurement/suppliers", procurementController.createSupplier);
procurementRouter.get("/procurement/orders", procurementController.getOrders);
procurementRouter.post("/procurement/orders", procurementController.createOrder);
procurementRouter.post("/procurement/grn", procurementController.createGRN);
procurementRouter.get("/procurement/bills", procurementController.getBills);
procurementRouter.post("/procurement/bills", procurementController.createBill);
procurementRouter.post("/procurement/bills/:id/post", procurementController.postBill);
procurementRouter.post("/procurement/payments", procurementController.recordPayment);
