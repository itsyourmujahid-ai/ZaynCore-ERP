import { Router } from "express";
import { inventoryController } from "../controllers/inventory.controller.js";
import { requireTenant } from "../middleware/tenant.middleware.js";

export const inventoryRouter = Router();

inventoryRouter.use(requireTenant);
inventoryRouter.get("/inventory/items", inventoryController.getItems);
inventoryRouter.post("/inventory/items", inventoryController.createItem);
inventoryRouter.get("/inventory/valuation", inventoryController.getValuation);
inventoryRouter.post("/inventory/transfers", inventoryController.transferStock);
inventoryRouter.post("/inventory/adjustments", inventoryController.adjustStock);
