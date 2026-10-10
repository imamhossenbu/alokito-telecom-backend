import crypto from "crypto";
import { Types } from "mongoose";
import { normalizeSms } from "../../sms/normalizer/normalizer";
import { PaymentSmsEventModel, SmsEventVerificationStatus } from "../paymentDevices/smsEvent.model";

function generateSmsFingerprint(provider: string, transactionId: string, amount: number, receivedAt: Date): string {
  const payload = `${provider.toUpperCase()}:${transactionId.toUpperCase()}:${amount}:${receivedAt.toISOString()}`;
  return crypto.createHash("sha256").update(payload).digest("hex");
}
import { topUpService } from "../topups/topup.service";
import { systemSettingsService } from "../systemSettings/systemSettings.service";
import { poishaToBdt } from "../../shared/utils/money";
import { logger } from "../../config/logger";
import { AdminModel } from "../admins/admin.model";

export const smsWebhookService = {
  /**
   * Universal SMS ingestion for Webhooks, Telegram Bot, or Manual Input
   */
  async ingestSmsContent(
    smsContent: string,
    senderPhone?: string,
    source: "FORWARDER_WEBHOOK" | "TELEGRAM_BOT" | "MANUAL" = "FORWARDER_WEBHOOK"
  ) {
    if (!smsContent || typeof smsContent !== "string" || smsContent.trim().length === 0) {
      throw new Error("SMS content is empty");
    }

    // 1. Normalize and parse SMS
    const parsed = normalizeSms(smsContent.trim(), senderPhone);

    const smsFingerprint = generateSmsFingerprint(
      parsed.provider,
      parsed.transactionId,
      parsed.amount,
      parsed.receivedAt
    );

    // 2. Check for duplicate SMS event
    const existing = await PaymentSmsEventModel.findOne({ smsFingerprint });
    if (existing) {
      return {
        success: true,
        isDuplicate: true,
        provider: existing.provider,
        transactionId: existing.transactionId,
        amount: poishaToBdt(existing.amount),
        verificationStatus: existing.verificationStatus,
        message: "SMS ইতিমধ্যে সিস্টেমে রিসিভ করা হয়েছে",
      };
    }

    // Find default admin ID for reference
    const defaultAdmin = await AdminModel.findOne().select("_id");
    const adminId = defaultAdmin?._id || new Types.ObjectId();

    // 3. Save SMS event
    const event = await PaymentSmsEventModel.create({
      adminId,
      source,
      provider: parsed.provider,
      transactionId: parsed.transactionId.toUpperCase(),
      amount: parsed.amount,
      sender: parsed.sender,
      receiver: parsed.receiver,
      reference: parsed.reference,
      receivedAt: parsed.receivedAt || new Date(),
      smsFingerprint,
      parserVersion: "2.0.0",
      verificationStatus: SmsEventVerificationStatus.UNUSED,
    });

    // 4. Auto-match with any pending user top-up
    let matched = false;
    let matchedUserPhone: string | undefined;
    try {
      const matchResult = await topUpService.autoMatchPendingTopUp(event);
      if (matchResult && event.verificationStatus === SmsEventVerificationStatus.MATCHED) {
        matched = true;
      }
    } catch (err) {
      logger.warn({ err, eventId: event._id }, "Failed to auto-match pending topup on webhook ingestion");
    }

    // 5. Send Telegram notification if configured
    try {
      const settings = await systemSettingsService.getSettings();
      const botToken =
        settings.smsIntegration?.telegramBotToken ||
        process.env.TELEGRAM_BOT_TOKEN ||
        "8974788916:AAEvyNJ3JOO0PPHI9UwPwXNp01T4HJ6XxdA";
      const chatId = settings.smsIntegration?.telegramChatId;

      if (settings.smsIntegration?.isTelegramEnabled !== false && botToken && chatId) {
        const text = matched
          ? `✅ *পেমেন্ট সফলভাবে যোগ হয়েছে!*\n💰 *প্রোভাইডার:* ${parsed.provider}\n🆔 *TrxID:* \`${parsed.transactionId.toUpperCase()}\`\n💵 *পরিমাণ:* ৳${poishaToBdt(parsed.amount)}\n📱 *কাস্টমার অ্যাকাউন্টে ব্যালেন্স যুক্ত হয়েছে!*`
          : `📥 *নতুন SMS রিসিভ হয়েছে (Unused)*\n💰 *প্রোভাইডার:* ${parsed.provider}\n🆔 *TrxID:* \`${parsed.transactionId.toUpperCase()}\`\n💵 *পরিমাণ:* ৳${poishaToBdt(parsed.amount)}\nℹ️ *কাস্টমার অ্যাপে সাবমিট করলে স্বয়ংক্রিয়ভাবে ক্রেডিট হবে।*`;
        
        await this.sendTelegramRawMessage(botToken, chatId, text);
      }
    } catch (_) {}

    return {
      success: true,
      isDuplicate: false,
      provider: parsed.provider,
      transactionId: parsed.transactionId.toUpperCase(),
      amount: poishaToBdt(parsed.amount),
      matched,
      matchedUserPhone,
      verificationStatus: event.verificationStatus,
      message: matched
        ? "SMS সফলভাবে ভেরিফাই হয়ে কাস্টমারের ওয়ালেটে ক্রেডিট হয়েছে"
        : "SMS সফলভাবে সিস্টেমে যুক্ত হয়েছে (কাস্টমার রিকোয়েস্টের জন্য অপেক্ষমাণ)",
    };
  },

  /**
   * Send Telegram message via Bot API
   */
  async sendTelegramRawMessage(botToken: string, chatId: string, text: string) {
    if (!botToken || !chatId) return;
    try {
      const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "Markdown",
        }),
      });
    } catch (err) {
      logger.warn({ err }, "Failed to send Telegram message");
    }
  },

  /**
   * Handle incoming Telegram webhook updates
   */
  async handleTelegramUpdate(update: any) {
    const message = update?.message || update?.channel_post;
    if (!message) return { ok: true };

    const chatId = message.chat?.id?.toString();
    const text = (message.text || message.caption || "").toString().trim();
    if (!chatId || !text) return { ok: true };

    const settings = await systemSettingsService.getSettings();
    const botToken =
      settings.smsIntegration?.telegramBotToken ||
      process.env.TELEGRAM_BOT_TOKEN ||
      "8974788916:AAEvyNJ3JOO0PPHI9UwPwXNp01T4HJ6XxdA";

    // Auto-save admin chat ID if not set
    if (!settings.smsIntegration?.telegramChatId && chatId) {
      if (!settings.smsIntegration) {
        settings.smsIntegration = {
          telegramBotToken: botToken,
          telegramChatId: chatId,
          forwarderApiKey: "alokito_sms_forwarder_key_2026",
          isTelegramEnabled: true,
        };
      } else {
        settings.smsIntegration.telegramChatId = chatId;
        settings.smsIntegration.isTelegramEnabled = true;
      }
      await settings.save().catch(() => {});
    }

    // Command: /start or /help
    if (text === "/start" || text === "/help") {
      const reply = `🤖 *আলোকিত টেলিকম পেমেন্ট বট*\n\nআপনার চ্যাট আইডি: \`${chatId}\` (সিস্টেমে অটো-কানেক্টেড ✅)\n\nএই বটে আপনার বিকাশ, নগদ, রকেট বা উপায়ের ক্যাশ-ইন / রিসিভ করা SMS ফরোয়ার্ড বা পেস্ট করলেই সাথে সাথে কাস্টমারের ব্যালেন্স অটো-ক্রেডিট হয়ে যাবে!\n\n📋 *কমান্ডসমূহ:*\n/id - আপনার Chat ID জানতে\n/status - সিস্টেম স্ট্যাটাস জানতে`;
      if (botToken) await this.sendTelegramRawMessage(botToken, chatId, reply);
      return { ok: true };
    }

    // Command: /id
    if (text === "/id") {
      if (botToken) {
        await this.sendTelegramRawMessage(
          botToken,
          chatId,
          `🆔 আপনার Telegram Chat ID হলো: \`${chatId}\`\n\nএটি এডমিন প্যানেলের Settings > SMS Integration-এ যুক্ত করুন।`
        );
      }
      return { ok: true };
    }

    // Command: /status
    if (text === "/status") {
      const totalEvents = await PaymentSmsEventModel.countDocuments();
      const unusedEvents = await PaymentSmsEventModel.countDocuments({ verificationStatus: SmsEventVerificationStatus.UNUSED });
      const matchedEvents = await PaymentSmsEventModel.countDocuments({ verificationStatus: SmsEventVerificationStatus.MATCHED });
      const reply = `📊 *সিস্টেম স্ট্যাটাস*\n\nমোট SMS রিসিভ: ${totalEvents}\nসফল ম্যাচ/ক্রেডিট: ${matchedEvents}\nঅব্যবহৃত SMS: ${unusedEvents}\nভেরিফিকেশন মোড: ${settings.verificationMode}`;
      if (botToken) await this.sendTelegramRawMessage(botToken, chatId, reply);
      return { ok: true };
    }

    // Process incoming message as payment SMS
    try {
      const result = await this.ingestSmsContent(text, undefined, "TELEGRAM_BOT");
      if (botToken) {
        const replyText = result.matched
          ? `✅ *সফল!*\n${result.provider} ট্রানজ্যাকশন \`${result.transactionId}\` (৳${result.amount}) কাস্টমার অ্যাকাউন্টে ক্রেডিট হয়েছে!`
          : result.isDuplicate
          ? `⚠️ *ইতিমধ্যে ব্যবহৃত!*\nএই TrxID \`${result.transactionId}\` আগেই প্রসেস করা হয়েছে।`
          : `📥 *SMS গৃহীত হয়েছে!*\n${result.provider} TrxID: \`${result.transactionId}\` (৳${result.amount})\nকাস্টমার অ্যাপে সাবমিট করলে স্বয়ংক্রিয়ভাবে যুক্ত হবে।`;
        await this.sendTelegramRawMessage(botToken, chatId, replyText);
      }
    } catch (err: any) {
      if (botToken) {
        await this.sendTelegramRawMessage(
          botToken,
          chatId,
          `❌ *SMS পার্স করা যায়নি!*\n\nবার্তাটিতে বিকাশ, নগদ বা রকেটের সঠিক ট্রানজ্যাকশন আইডি ও পরিমাণ পাওয়া যায়নি।`
        );
      }
    }

    return { ok: true };
  },
};
