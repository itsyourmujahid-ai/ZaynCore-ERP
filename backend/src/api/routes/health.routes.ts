import { Router } from "express";
import { db } from "../../database/storage.js";
import { checkDatabaseConnection } from "../../database/pg-client.js";

export const healthRouter = Router();

healthRouter.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "enterprise-erp-api",
    version: "1.0.0",
    uptime: process.uptime()
  });
});

healthRouter.get("/ready", async (req, res) => {
  try {
    const pgHealth = await checkDatabaseConnection();
    const companies = db.getCompanies();
    
    // In strict production, fail if PostgreSQL is not reachable
    if (process.env.NODE_ENV === "production" && !pgHealth.connected) {
      return res.status(503).json({
        status: "not_ready",
        error: "PostgreSQL database not reachable",
        database: {
          engine: "postgresql",
          connected: false,
          error: pgHealth.error
        },
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      status: "ready",
      database: {
        engine: pgHealth.connected ? "postgresql" : "in-memory",
        status: "connected",
        postgres: pgHealth,
        tenantsLoaded: companies.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(503).json({
      status: "not_ready",
      error: "Storage engine not ready",
      timestamp: new Date().toISOString()
    });
  }
});
