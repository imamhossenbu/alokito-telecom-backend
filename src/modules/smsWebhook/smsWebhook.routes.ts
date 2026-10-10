import { Router } from "express";
import { smsWebhookController } from "./smsWebhook.controller";
import { asyncHandler } from "../../shared/utils/async-handler";
import { adminMiddleware } from "../../middleware/admin.middleware";

const router = Router();

// 1. Android SMS Forwarder Webhook
// Can accept POST (JSON or text) and GET (for test/healthcheck)
router.post("/forwarder-webhook", asyncHandler(smsWebhookController.handleForwarderWebhook));
router.get("/forwarder-webhook", (req, res) => {
  res.json({
    status: "ACTIVE",
    service: "Alokito Telecom Universal SMS Forwarder Webhook",
    usage: "Send HTTP POST with JSON { \"content\": \"...\", \"from\": \"bKash\" }",
    timestamp: new Date().toISOString(),
  });
});

// 2. Telegram Bot Webhook
router.post("/telegram-webhook", asyncHandler(smsWebhookController.handleTelegramWebhook));
router.get("/telegram-webhook", (req, res) => {
  res.json({
    status: "ACTIVE",
    service: "Alokito Telecom Telegram Bot Webhook",
    timestamp: new Date().toISOString(),
  });
});

// 3. Admin Manual SMS Test
router.post("/test-ingest", adminMiddleware, asyncHandler(smsWebhookController.handleManualTest));

export default router;
