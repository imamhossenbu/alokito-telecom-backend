import express, { Application } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import pinoHttp from "pino-http";

import { env } from "./config/env";
import { logger } from "./config/logger";
import { requestIdMiddleware } from "./middleware/requestId.middleware";
import { defaultApiRateLimiter } from "./middleware/rateLimit.middleware";
import {
  errorMiddleware,
  notFoundMiddleware,
} from "./middleware/error.middleware";
import healthRoutes from "./modules/health.routes";
import v1Router from "./routes/v1";
import docsRouter, { docsEnabled } from "./docs/swagger.routes";

export function createApp(): Application {
  const app = express();

  // Trust proxy (needed for correct req.ip behind a load balancer).
  app.set("trust proxy", 1);

  // --- Security headers (spec section 119) ---
  // CSP is left off: this is a JSON API, not an HTML-serving app, so the
  // XSS-mitigation value of CSP is minimal here — and a default CSP would
  // block Swagger UI's inline scripts/styles at /api/docs.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: "same-site" },
    }),
  );

  // --- CORS (spec section 120): explicit whitelist, never '*' ---
  app.use(
    cors({
      origin: env.corsOrigins,
      credentials: true,
    }),
  );

  app.use(compression());
  app.use(cookieParser());

  // --- Request body limits (spec section 121): prevent huge payload attacks ---
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));

  // --- Request tracing ---
  app.use(requestIdMiddleware);
  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => res.locals.requestId as string,
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return "error";
        if (res.statusCode >= 400) return "warn";
        return "info";
      },
      // Never log sensitive fields (spec section 89) — handled centrally
      // via the redact config on the base logger instance.
      autoLogging: true,
    }),
  );

  // --- Default rate limit for all API traffic; sensitive routes layer
  // stricter limiters on top (spec section 85) ---
  app.use("/api", defaultApiRateLimiter);

  // --- Health checks (unversioned, no rate limit) ---
  app.use(healthRoutes);

  // --- API docs (Swagger UI + raw OpenAPI JSON), auto-generated from
  // the same Zod schemas used for request validation ---
  if (docsEnabled) {
    app.use("/api/docs", docsRouter);
  }

  // --- Versioned API (spec section 87) ---
  app.use("/api/v1", v1Router);

  // --- 404 + error handling ---
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
