import express from "express";
import cors from "cors";
import { tenantContextMiddleware } from "./api/middleware/tenant.middleware.js";
import { errorHandler } from "./api/middleware/error.middleware.js";
import { apiRouter } from "./api/routes/api.router.js";
import { db } from "./database/storage.js";

export function createServer() {
  const app = express();

  // Production Security Headers
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    next();
  });

  // Production CORS Configuration
  const allowedOrigins = process.env.CORS_ORIGIN 
    ? process.env.CORS_ORIGIN.split(",").map(o => o.trim())
    : ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"];

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== "production") {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-company-id", "x-user-id", "x-user-role"]
  }));

  // Request body parsing with size limits
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Multi-tenant context extraction
  app.use(tenantContextMiddleware);

  // Mount API router under /api
  app.use("/api", apiRouter);

  // 404 Fallback
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: "ROUTE_NOT_FOUND",
        message: `Endpoint ${req.method} ${req.originalUrl} does not exist`
      }
    });
  });

  // Global error handler
  app.use(errorHandler);

  return app;
}

export function startServer(port: number = 3000) {
  const app = createServer();
  return app.listen(port, () => {
    console.log(`[Enterprise ERP Backend] Server listening on port ${port}`);
  });
}

// Start if executed directly
if (process.env.NODE_ENV !== "test" && (
  !process.env.VITEST && 
  (process.argv[1]?.includes("server") || import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/') || ''))
)) {
  const port = Number(process.env.PORT) || 3000;
  startServer(port);
}

