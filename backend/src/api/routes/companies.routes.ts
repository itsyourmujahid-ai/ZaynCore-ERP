import { Router } from "express";
import { companiesController } from "../controllers/companies.controller.js";

export const companiesRouter = Router();

companiesRouter.get("/companies", companiesController.getCompanies);
companiesRouter.post("/companies", companiesController.createCompany);
companiesRouter.get("/companies/:id", companiesController.getCompany);
