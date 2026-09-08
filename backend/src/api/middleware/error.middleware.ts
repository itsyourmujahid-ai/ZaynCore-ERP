import type { Request, Response, NextFunction } from "express";

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error("[API Error]", err);

  const statusCode = err.status || err.statusCode || (
    err.name === "TenantViolationError" ? 403 :
    err.name === "PeriodClosedError" ? 400 :
    err.name === "ImmutableRecordError" ? 400 :
    err.name === "OutOfBalanceError" ? 400 :
    err.name === "ValidationError" ? 400 :
    err.name === "NotFoundError" ? 404 : 500
  );

  return res.status(statusCode).json({
    success: false,
    error: {
      code: err.name || "INTERNAL_SERVER_ERROR",
      message: err.message || "An unexpected error occurred",
      details: err.details || undefined
    },
    meta: {
      timestamp: new Date().toISOString()
    }
  });
}
