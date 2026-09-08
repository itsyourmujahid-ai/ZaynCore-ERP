import { Router } from "express";
import { healthRouter } from "./health.routes.js";
import { authRouter } from "./auth.routes.js";
import { companiesRouter } from "./companies.routes.js";
import { accountingRouter } from "./accounting.routes.js";
import { salesRouter } from "./sales.routes.js";
import { procurementRouter } from "./procurement.routes.js";
import { inventoryRouter } from "./inventory.routes.js";
import { bankingRouter } from "./banking.routes.js";

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use(authRouter);
apiRouter.use(companiesRouter);
apiRouter.use(accountingRouter);
apiRouter.use(salesRouter);
apiRouter.use(procurementRouter);
apiRouter.use(inventoryRouter);
apiRouter.use(bankingRouter);
