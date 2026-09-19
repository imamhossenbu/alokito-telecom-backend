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
    maxAge: "30d",
    setHeaders: (res, filePath) => {
      if (filePath.endsWith("index.html")) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      } else if (filePath.endsWith(".js") || filePath.endsWith(".wasm") || filePath.endsWith(".ttf") || filePath.endsWith(".png") || filePath.endsWith(".json")) {
        res.setHeader("Cache-Control", "public, max-age=2592000, immutable");
      }
    },
  }));
  app.get(["/admin", "/admin/*"], (_req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.sendFile(path.join(process.cwd(), "public", "admin-web", "index.html"));
  });

  // --- APK Download Endpoints (Immediate auto-download on click) ---
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
    }

    const filePath = path.join(process.cwd(), "public", "downloads", target);
    if (fs.existsSync(filePath)) {
      return res.download(filePath, target);
    }
    return res.status(404).send(`APK file not found: ${target}`);
  });

  // --- Mobile Apps Download Portal Page ---
  app.get("/downloads", (_req, res) => {
    const html = `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Alokito Telecom - Official Apps Download</title>
  <link rel="icon" type="image/png" href="/public/favicon.png">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Hind+Siliguri:wght@500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #0D5E36;
      --primary-light: #15803D;
      --bg: #0B131E;
      --card-bg: rgba(255, 255, 255, 0.05);
      --border: rgba(255, 255, 255, 0.1);
      --text: #F8FAFC;
      --text-muted: #94A3B8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', 'Hind Siliguri', sans-serif;
      background: radial-gradient(circle at top, #13271E 0%, #080D14 100%);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 40px 20px;
    }
    .container {
      max-width: 680px;
      width: 100%;
    }
    .header {
      text-align: center;
      margin-bottom: 36px;
    }
    .logo-img {
      width: 80px;
      height: 80px;
      border-radius: 20px;
      background: #ffffff;
      padding: 4px;
      box-shadow: 0 10px 30px rgba(13, 94, 54, 0.4);
      margin-bottom: 16px;
      object-fit: contain;
    }
    .logo-badge {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      background: rgba(13, 94, 54, 0.3);
      border: 1px solid rgba(22, 163, 74, 0.4);
      padding: 6px 14px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      color: #4ADE80;
      margin-bottom: 12px;
    }
    h1 {
      font-size: 32px;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin-bottom: 8px;
    }
    p.sub {
      color: var(--text-muted);
      font-size: 15px;
    }
    .apps-grid {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .app-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 24px;
      backdrop-filter: blur(16px);
      transition: all 0.2s ease;
    }
    .app-card:hover {
      border-color: rgba(34, 197, 94, 0.4);
      transform: translateY(-2px);
    }
    .card-top {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 16px;
    }
    .app-icon {
      width: 56px;
      height: 56px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;
      background: white;
      padding: 4px;
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
    }
    .app-icon img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .app-info h2 {
      font-size: 19px;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .badges {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .badge {
      font-size: 11px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.08);
      color: #CBD5E1;
    }
    .badge.green {
      background: rgba(34, 197, 94, 0.15);
      color: #4ADE80;
    }
    .description {
      font-size: 13px;
      color: var(--text-muted);
      line-height: 1.5;
      margin-bottom: 20px;
    }
    .btn-group {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
    .btn-download {
      flex: 1;
      min-width: 200px;
      background: linear-gradient(135deg, #15803D, #16A34A);
      color: white;
      text-decoration: none;
      font-weight: 700;
      font-size: 14px;
      padding: 13px 20px;
      border-radius: 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: 0 4px 14px rgba(22, 163, 74, 0.3);
      transition: all 0.2s ease;
    }
    .btn-download:hover {
      background: linear-gradient(135deg, #166534, #15803D);
      transform: translateY(-1px);
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #E2E8F0;
      text-decoration: none;
      font-size: 13px;
      font-weight: 600;
      padding: 13px 16px;
      border-radius: 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.12);
    }
    .btn-web {
      background: rgba(22, 163, 74, 0.15);
      border: 1px solid rgba(74, 222, 128, 0.4);
      color: #4ADE80;
      text-decoration: none;
      font-size: 13px;
      font-weight: 700;
      padding: 13px 16px;
      border-radius: 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }
    .btn-web:hover {
      background: rgba(22, 163, 74, 0.25);
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      font-size: 12px;
      color: #64748B;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="/public/logo.png" class="logo-img" alt="Alokito Telecom Logo" />
      <div>
        <div class="logo-badge">⚡ Alokito Telecom Production Suite</div>
      </div>
      <h1>অফিসিয়াল অ্যাপস ডাউনলোড</h1>
      <p class="sub">সরাসরি লিংকে ক্লিক করলেই আপনার ফোনে APK ডাউনলোড শুরু হয়ে যাবে</p>
    </div>

    <div class="apps-grid">
      <!-- Alokito Telecom Admin App Card -->
      <div class="app-card">
        <div class="card-top">
          <div class="app-icon">
            <img src="/public/logo.png" alt="Admin App" />
          </div>
          <div class="app-info">
            <h2>Alokito Telecom - Admin App</h2>
            <div class="badges">
              <span class="badge green">Production Ready</span>
              <span class="badge">v1.0.0</span>
              <span class="badge">Android & Web</span>
            </div>
          </div>
        </div>
        <div class="description">
          ড্রাইভ ও রেগুলার অফার ম্যানেজমেন্ট, ক্যাটাগরি তৈরি ও ডিলিট, রিয়েলটাইম অর্ডার প্রসেসিং, ইউজার কন্ট্রোল, নোটিফিকেশন অ্যালার্ট ও ব্রাউজার সাপোর্ট।
        </div>
        <div class="btn-group">
          <a href="/download/admin" class="btn-download" download>
            ⬇️ Download Admin APK (Main)
          </a>
          <a href="/admin" class="btn-web" target="_blank">
            🌐 Open Web Admin
          </a>
          <a href="/download/admin-v7a" class="btn-secondary" download title="Compact build">
            v7a Build
          </a>
        </div>
      </div>

      <!-- Alokito Telecom SMS Listener App Card -->
      <div class="app-card">
        <div class="card-top">
          <div class="app-icon">
            <img src="/public/logo.png" alt="SMS Listener" />
          </div>
          <div class="app-info">
            <h2>Alokito Telecom - SMS Listener</h2>
            <div class="badges">
              <span class="badge green">Production Ready</span>
              <span class="badge">v1.0.0</span>
              <span class="badge">Background Service</span>
            </div>
          </div>
        </div>
        <div class="description">
          বিকাশ, নগদ ও রকেটের ইনকামিং SMS স্বয়ংক্রিয়ভাবে সার্ভারে সিঙ্ক ও পেমেন্ট ভেরিফাই করার ডেডিকেটেড ব্যাকগ্রাউন্ড সার্ভিস অ্যাপ।
        </div>
        <div class="btn-group">
          <a href="/download/listener" class="btn-download" download>
            ⬇️ Download SMS Listener APK (Main)
          </a>
          <a href="/download/listener-v7a" class="btn-secondary" download title="Compact build">
            v7a Build
          </a>
        </div>
      </div>
    </div>

    <div class="footer">
      Alokito Telecom &copy; 2026. All rights reserved.
    </div>
  </div>
</body>
</html>`;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
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
