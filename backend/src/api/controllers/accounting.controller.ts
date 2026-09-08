import type { Response, NextFunction } from "express";
import { db } from "../../database/storage.js";
import { accountingPostingService } from "../../modules/accounting/services/accounting-posting.service.js";
import { generalLedgerService } from "../../modules/accounting/services/general-ledger.service.js";
import { subLedgerService } from "../../modules/accounting/services/sub-ledger.service.js";
import { buildTenantContext, type AuthenticatedRequest } from "../middleware/tenant.middleware.js";

export const accountingController = {
  getAccounts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ctx = buildTenantContext(req);
      const accounts = db.getAccounts(ctx);
      res.json({ success: true, data: accounts });
    } catch (err) {
      next(err);
    }
  },

  getJournals(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ctx = buildTenantContext(req);
      const journals = db.getJournalEntries(ctx);
      res.json({ success: true, data: journals });
    } catch (err) {
      next(err);
    }
  },

  postJournal(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ctx = buildTenantContext(req);
      const journal = accountingPostingService.post('MANUAL_JOURNAL_POSTED', req.body, ctx);
      res.json({ success: true, data: journal });
    } catch (err) {
      next(err);
    }
  },

  getTrialBalance(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ctx = buildTenantContext(req);
      const { startDate, endDate, periodId } = req.query as Record<string, string>;
      const trialBalance = generalLedgerService.getTrialBalance({ startDate, endDate, periodId }, ctx);
      res.json({ success: true, data: trialBalance });
    } catch (err) {
      next(err);
    }
  },

  getGeneralLedger(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ctx = buildTenantContext(req);
      const { accountId, startDate, endDate, branchId, costCenterId } = req.query as Record<string, string>;
      const gl = generalLedgerService.getAccountLedger(accountId, { startDate, endDate, branchId, costCenterId }, ctx);
      res.json({ success: true, data: gl });
    } catch (err) {
      next(err);
    }
  },

  getSubLedgerReconciliation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ctx = buildTenantContext(req);
      const { subLedgerType } = req.query;
      const recon = subLedgerService.reconcileSubLedger((subLedgerType as any) || 'customer', ctx);
      res.json({ success: true, data: recon });
    } catch (err) {
      next(err);
    }
  }
};
