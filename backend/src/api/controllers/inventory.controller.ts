import type { Response, NextFunction } from "express";
import { db } from "../../database/storage.js";
import { inventoryService } from "../../modules/inventory/services/inventory.service.js";
import { inventoryValuationService } from "../../modules/inventory/services/inventory-valuation.service.js";
import { buildTenantContext, type AuthenticatedRequest } from "../middleware/tenant.middleware.js";

export const inventoryController = {
  getItems(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ctx = buildTenantContext(req);
      const items = db.getItems(ctx);
      res.json({ success: true, data: items });
    } catch (err) {
      next(err);
    }
  },

  createItem(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ctx = buildTenantContext(req);
      const item = inventoryService.createItem(req.body, ctx);
      res.json({ success: true, data: item });
    } catch (err) {
      next(err);
    }
  },

  getValuation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ctx = buildTenantContext(req);
      const valuation = inventoryValuationService.getValuationReport({}, ctx);
      res.json({ success: true, data: valuation });
    } catch (err) {
      next(err);
    }
  },

  transferStock(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ctx = buildTenantContext(req);
      const transfer = db.createStockTransfer(req.body, ctx);
      res.json({ success: true, data: transfer });
    } catch (err) {
      next(err);
    }
  },

  adjustStock(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ctx = buildTenantContext(req);
      const adjustment = db.createStockAdjustment(req.body, ctx);
      res.json({ success: true, data: adjustment });
    } catch (err) {
      next(err);
    }
  }
};
