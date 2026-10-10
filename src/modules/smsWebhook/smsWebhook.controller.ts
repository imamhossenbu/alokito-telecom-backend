import { Request, Response } from "express";
import { smsWebhookService } from "./smsWebhook.service";
import { systemSettingsService } from "../systemSettings/systemSettings.service";
import { sendSuccess } from "../../shared/utils/api-response";

export const smsWebhookController = {
  /**
   * Universal Webhook for Android SMS Forwarder Apps
   * (e.g. "SMS Forwarder", "SmsForwarder to HTTP", "fwd2tlg", etc.)
   */
  async handleForwarderWebhook(req: Request, res: Response) {
    // 1. Verify API key if provided
    const settings = await systemSettingsService.getSettings();
    const expectedKey = settings.smsIntegration?.forwarderApiKey;
    const providedKey = req.headers["x-api-key"] || req.query.apiKey || req.query.key;

    if (expectedKey && expectedKey.trim().length > 0 && providedKey && providedKey !== expectedKey) {
      return res.status(401).json({ success: false, message: "Invalid API key" });
    }

    // 2. Extract SMS content and sender across various SMS Forwarder JSON schemas
    let content = "";
    let sender = "";

    if (typeof req.body === "string") {
      content = req.body;
    } else if (typeof req.body === "object" && req.body !== null) {
      content =
        req.body.content ||
        req.body.message ||
        req.body.body ||
        req.body.text ||
        req.body.sms ||
        req.body.msg ||
        req.body.sms_content ||
        "";
      sender =
        req.body.from ||
        req.body.sender ||
        req.body.phone ||
        req.body.sender_number ||
        req.body.originatingAddress ||
        "";
    }

    if (!content && req.query.content) {
      content = String(req.query.content);
    }
    if (!sender && req.query.from) {
      sender = String(req.query.from);
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "No SMS content found in request body or query parameter",
        hint: "Send JSON with 'content' or 'message' field, or send text/plain body.",
      });
    }

    try {
      const result = await smsWebhookService.ingestSmsContent(content, sender, "FORWARDER_WEBHOOK");
      return res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (err: any) {
      return res.status(400).json({
        success: false,
        message: err.message || "Failed to parse SMS content",
      });
    }
  },

  /**
   * Telegram Bot Webhook
   */
  async handleTelegramWebhook(req: Request, res: Response) {
    try {
      await smsWebhookService.handleTelegramUpdate(req.body);
    } catch (err) {
      // Telegram expects 200 OK regardless so it doesn't endlessly retry malformed updates
    }
    return res.status(200).json({ ok: true });
  },

  /**
   * Admin manual SMS test
   */
  async handleManualTest(req: Request, res: Response) {
    const { smsContent, sender } = req.body;
    if (!smsContent) {
      return res.status(400).json({ success: false, message: "smsContent is required" });
    }
    try {
      const result = await smsWebhookService.ingestSmsContent(smsContent, sender, "MANUAL");
      sendSuccess(res, { data: result });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message || "Could not parse SMS" });
    }
  },
};
