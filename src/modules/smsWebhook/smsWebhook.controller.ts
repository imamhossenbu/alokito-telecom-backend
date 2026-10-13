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
    const authHeader = (req.headers["authorization"] as string) || "";
    const authBearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : authHeader.trim();
    const providedKey = (req.headers["x-api-key"] as string) || authBearer || req.query.apiKey || req.query.key;

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

    if (!content) {
      content = String(req.query.content || req.query.msg || req.query.message || req.query.text || "");
    }
    if (!sender) {
      sender = String(req.query.from || req.query.sender || req.query.phone || "");
    }

    // If forwarder sends HTML formatted template like: "%t - %s (%c)<br/>Message: %m (%d)"
    if (content && (content.includes("<br/>") || content.includes("<br>") || content.includes("Message:"))) {
      if (!sender) {
        const senderMatch = content.match(/^(?:incoming|outgoing)\s*-\s*([^\s(<]+)/i);
        if (senderMatch && senderMatch[1]) {
          sender = senderMatch[1].trim();
        }
      }
      const messageMatch = content.match(/Message:\s*([\s\S]+)$/i);
      if (messageMatch && messageMatch[1]) {
        let clean = messageMatch[1].trim();
        clean = clean.replace(/\s*\(\d{2}[./-]\d{2}[./-]\d{4}\s+\d{2}:\d{2}\)$/, "");
        if (clean.length > 0) {
          content = clean;
        }
      }
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
