import { Router } from "express";
import { accountingController } from "../controllers/accounting.controller.js";
import { requireTenant } from "../middleware/tenant.middleware.js";

export const accountingRouter = Router();

accountingRouter.use(requireTenant);
accountingRouter.get("/accounting/accounts", accountingController.getAccounts);
accountingRouter.get("/accounting/journals", accountingController.getJournals);
accountingRouter.post("/accounting/journals", accountingController.postJournal);
accountingRouter.get("/accounting/trial-balance", accountingController.getTrialBalance);
accountingRouter.get("/accounting/general-ledger", accountingController.getGeneralLedger);
accountingRouter.get("/accounting/reconciliation", accountingController.getSubLedgerReconciliation);
