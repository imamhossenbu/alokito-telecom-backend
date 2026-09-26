import { Router } from "express";
import { isDatabaseConnected } from "../config/database";

const router = Router();

router.get("/", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "Alokito Telecom Backend API",
    downloads: "/downloads",
    docs: "/api/docs",
    health: "/health",
    timestamp: new Date().toISOString(),
  });
});

router.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    database: isDatabaseConnected() ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? "1.0.0",
  });
});

router.get("/health/live", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

router.get("/health/ready", (_req, res) => {
  const ready = isDatabaseConnected();
  res.status(ready ? 200 : 503).json({ status: ready ? "ready" : "not_ready" });
});

export default router;
