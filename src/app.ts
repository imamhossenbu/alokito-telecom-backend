import express, { Application } from "express";
import path from "path";
import fs from "fs";
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
import { systemSettingsService } from "./modules/systemSettings/systemSettings.service";
import { renderCustomerDownloadPage } from "./views/customerDownloadView";
import { renderAdminAppsPortalPage } from "./views/adminAppsPortalView";

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
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (env.isDevelopment) {
          return callback(null, true); // Allow all origins in development
        }

        if (
          origin.startsWith("http://localhost:") ||
          origin.startsWith("http://127.0.0.1:") ||
          origin.includes("onrender.com") ||
          env.corsOrigins.includes(origin)
        ) {
          return callback(null, true);
        }
        
        callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
    }),
  );

  app.use(compression({
    level: 6,
    threshold: 1024,
  }));
  app.use(cookieParser());
  app.use("/public", express.static("public", {
    maxAge: "7d",
  }));
  app.use("/admin", express.static(path.join(process.cwd(), "public", "admin-web"), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith("index.html") || filePath.endsWith(".js") || filePath.endsWith(".json")) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
      } else if (filePath.endsWith(".wasm") || filePath.endsWith(".ttf") || filePath.endsWith(".png") || filePath.endsWith(".jpg") || filePath.endsWith(".jpeg") || filePath.endsWith(".svg") || filePath.endsWith(".woff2")) {
        res.setHeader("Cache-Control", "public, max-age=86400");
      }
    },
  }));
  app.get(["/admin", "/admin/*"], (_req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.sendFile(path.join(process.cwd(), "public", "admin-web", "index.html"));
  });

  app.use("/customer", express.static(path.join(process.cwd(), "public", "customer-web"), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith("index.html") || filePath.endsWith(".js") || filePath.endsWith(".json")) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
      } else if (filePath.endsWith(".wasm") || filePath.endsWith(".ttf") || filePath.endsWith(".png") || filePath.endsWith(".jpg") || filePath.endsWith(".jpeg") || filePath.endsWith(".svg") || filePath.endsWith(".woff2")) {
        res.setHeader("Cache-Control", "public, max-age=86400");
      }
    },
  }));
  app.get(["/customer", "/customer/*"], (_req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.sendFile(path.join(process.cwd(), "public", "customer-web", "index.html"));
  });

  app.get("/app.apk", (_req, res) => res.redirect(302, "/download/customer"));

  app.get("/download/:file", (req, res) => {
    const raw = (req.params.file || "").toLowerCase();
    let target = req.params.file;
    if (raw === "admin" || raw === "admin.apk" || raw === "drive-offer-admin" || raw === "drive-offer-admin.apk" || raw === "alokito-admin" || raw === "alokito-admin.apk") {
      target = "drive-offer-admin.apk";
    } else if (raw === "admin-v7a" || raw === "admin-v7a.apk" || raw === "drive-offer-admin-v7a.apk") {
      target = "drive-offer-admin-v7a.apk";
    } else if (raw === "listener" || raw === "listener.apk" || raw === "driver-sms-listener" || raw === "driver-sms-listener.apk" || raw === "drive-offer-listener" || raw === "drive-offer-listener.apk" || raw === "sms-listener" || raw === "sms-listener.apk") {
      target = "driver-sms-listener.apk";
    } else if (raw === "listener-v7a" || raw === "listener-v7a.apk" || raw === "driver-sms-listener-v7a.apk" || raw === "drive-offer-listener-v7a.apk") {
      target = "driver-sms-listener-v7a.apk";
    } else if (raw === "customer" || raw === "customer.apk" || raw === "drive-offer-customer" || raw === "drive-offer-customer.apk" || raw === "alokito-customer" || raw === "alokito-customer.apk" || raw === "app.apk") {
      target = "drive-offer-customer.apk";
    } else if (raw === "customer-v7a" || raw === "customer-v7a.apk" || raw === "drive-offer-customer-v7a.apk") {
      target = "drive-offer-customer-v7a.apk";
    }

    const filePath = path.join(process.cwd(), "public", "downloads", target);
    if (fs.existsSync(filePath)) {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      return res.download(filePath, target);
    }
    return res.status(404).send(`APK file not found: ${target}`);
  });

  // --- Dedicated Customer App Download & Welcome Page ---
  // Exclusive link for customers: contains ONLY the Customer App APK & Web App, step-by-step install guide, and dynamic support buttons.
  // Absolutely NO admin or listener app links are exposed here.
  app.get([
    "/customer-app",
    "/customer-download",
    "/customer/download",
    "/customer/app",
    "/app/customer",
    "/get-app",
    "/download-customer",
    "/customer-portal",
    "/app",
    "/",
  ], async (_req, res) => {
    try {
      const settings = await systemSettingsService.getSettings().catch(() => null);
      const customerVer = settings?.appVersion?.customer;
      const contact = settings?.contactSupport;
      const html = renderCustomerDownloadPage({
        version: customerVer?.latestVersion || "1.0.9",
        build: customerVer?.buildNumber || 10,
        releaseNotes: customerVer?.releaseNotes,
        whatsapp: contact?.whatsapp || "https://wa.me/8801890000001",
        telegram: contact?.telegram || "https://t.me/alokito_telecom",
        offlinePhone: contact?.offlinePhone || "01890000001",
        facebook: contact?.facebook || "https://facebook.com",
        youtube: contact?.youtube || "https://youtube.com",
      });

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
      res.send(html);
    } catch (e) {
      const fallbackHtml = renderCustomerDownloadPage();
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(fallbackHtml);
    }
  });

  // --- Central Administrative & Staff Apps Portal ---
  // Contains Customer App, Admin App, and SMS Listener App with a quick banner to copy the customer link.
  app.get([
    "/portal",
    "/admin-apps",
    "/admin/downloads",
    "/admin-downloads",
    "/internal/apps",
    "/downloads",
    "/apps",
    "/all-apps",
  ], async (_req, res) => {
    try {
      const settings = await systemSettingsService.getSettings().catch(() => null);
      const customerVer = settings?.appVersion?.customer;
      const adminVer = settings?.appVersion?.admin;

      const html = renderAdminAppsPortalPage({
        customerVersion: customerVer?.latestVersion || "1.0.9",
        customerBuild: customerVer?.buildNumber || 10,
        adminVersion: adminVer?.latestVersion || "1.0.9",
        adminBuild: adminVer?.buildNumber || 10,
        listenerVersion: "1.0.3",
      });

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
      res.send(html);
    } catch (e) {
      const fallbackHtml = renderAdminAppsPortalPage();
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(fallbackHtml);
    }
  });

  // --- Request body limits: support base64 profile images and large payloads ---
  app.use(express.json({ limit: "20mb" }));
  app.use(express.urlencoded({ extended: true, limit: "20mb" }));

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
