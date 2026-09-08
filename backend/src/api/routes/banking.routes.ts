import { Router } from "express";
import { bankingController } from "../controllers/banking.controller.js";
import { requireTenant } from "../middleware/tenant.middleware.js";

export const bankingRouter = Router();

bankingRouter.use(requireTenant);
bankingRouter.get("/banking/accounts", bankingController.getAccounts);
bankingRouter.post("/banking/accounts", bankingController.createAccount);
bankingRouter.get("/banking/transactions", bankingController.getTransactions);
