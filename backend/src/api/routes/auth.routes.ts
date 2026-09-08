import { Router } from "express";
import { authController } from "../controllers/auth.controller.js";

export const authRouter = Router();

authRouter.post("/auth/login", authController.login);
authRouter.get("/auth/me", authController.me);
