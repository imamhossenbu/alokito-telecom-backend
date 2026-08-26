import { Router } from "express";
import { isDatabaseConnected } from "../config/database";

const router = Router();

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
