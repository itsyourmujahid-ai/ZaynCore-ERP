import type { Response, NextFunction } from "express";
import { db } from "../../database/storage.js";
import { bankingService } from "../../modules/banking/services/banking.service.js";
import { buildTenantContext, type AuthenticatedRequest } from "../middleware/tenant.middleware.js";

export const bankingController = {
  getAccounts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ctx = buildTenantContext(req);
      const accounts = db.getBankAccounts(ctx);
      res.json({ success: true, data: accounts });
    } catch (err) {
      next(err);
    }
  },

  createAccount(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ctx = buildTenantContext(req);
      const account = bankingService.createBankAccount(req.body, ctx);
      res.json({ success: true, data: account });
    } catch (err) {
      next(err);
    }
  },

  getTransactions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ctx = buildTenantContext(req);
      const bankAccountId = req.query.bankAccountId as string | undefined;
      const txs = db.getBankTransactions(bankAccountId, ctx);
      res.json({ success: true, data: txs });
    } catch (err) {
      next(err);
    }
  }
};
