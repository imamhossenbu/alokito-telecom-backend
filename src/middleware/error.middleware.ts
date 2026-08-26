import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { MulterError } from "multer";
import { AppError } from "../shared/errors/app-error";
import { logger } from "../config/logger";
import { env } from "../config/env";

export function notFoundMiddleware(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: `Route ${req.method} ${req.originalUrl} not found`,
    },
    requestId: res.locals.requestId,
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const requestId = res.locals.requestId;

  // Known, intentional application errors.
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, requestId }, "AppError (5xx)");
    } else {
      logger.warn({ code: err.code, requestId }, err.message);
    }

    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details ?? {},
      },
      requestId,
    });
    return;
  }

  // Zod validation errors that slipped through without being wrapped.
  if (err instanceof ZodError) {
    res.status(422).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details: { issues: err.flatten() },
      },
      requestId,
    });
    return;
  }

  // File upload errors (too large, too many files, etc).
  if (err instanceof MulterError) {
    res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: `Upload error: ${err.message}`,
      },
      requestId,
    });
    return;
  }

  // Malformed ObjectId / CastError from Mongoose.
  if (err instanceof Error && err.name === "CastError") {
    res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Invalid identifier format" },
      requestId,
    });
    return;
  }

  // MongoDB duplicate key error.
  if (
    err &&
    typeof err === "object" &&
    "code" in err &&
    (err as { code: unknown }).code === 11000
  ) {
    res.status(409).json({
      success: false,
      error: {
        code: "USER_ALREADY_EXISTS",
        message: "Duplicate value violates a unique constraint",
      },
      requestId,
    });
    return;
  }

  // Unknown/unexpected errors: never leak internals to the client.
  logger.error({ err, requestId }, "Unhandled error");

  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: env.isProduction
        ? "Something went wrong"
        : ((err as Error)?.message ?? "Unknown error"),
    },
    requestId,
  });
}
