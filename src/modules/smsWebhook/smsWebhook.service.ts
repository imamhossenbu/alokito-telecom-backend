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
    source: "FORWARDER_WEBHOOK" | "TELEGRAM_BOT" | "MANUAL" = "FORWARDER_WEBHOOK",
    explicitReceiver?: string
  ) {
    if (!smsContent || typeof smsContent !== "string" || smsContent.trim().length === 0) {
      throw new Error("SMS content is empty");
    }

    // 0. Fraud Protection: In Bangladesh, MFS never sends official receipts from personal mobile numbers
    if (source === "FORWARDER_WEBHOOK" && senderPhone && typeof senderPhone === "string") {
      const cleanSender = senderPhone.trim().replace(/[\s-]/g, "");
      if (/^(\+?8801|01)[3-9]\d{8}$/.test(cleanSender)) {
        logger.warn({ senderPhone, smsContent }, "Rejected SMS from personal mobile number - Potential Fraud Attempt");
        throw new Error(`ব্যক্তিগত মোবাইল নম্বর (${senderPhone}) থেকে আসা SMS গ্রহণযোগ্য নয়। এটি বিকাশ/নগদ/রকেটের অফিশিয়াল SMS নয়।`);
      }
    }

    // 1. Normalize and parse SMS
    const parsed = normalizeSms(smsContent.trim(), senderPhone);

    const smsFingerprint = generateSmsFingerprint(
      parsed.provider,
      parsed.transactionId,
      parsed.amount,
      parsed.receivedAt
    );

    const cleanTrxId = parsed.transactionId.trim().toUpperCase();

    const settings = await systemSettingsService.getSettings();
    const timeBd = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Dhaka",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(parsed.receivedAt || new Date());

    const isPhoneNumber = (val?: string) => Boolean(val && /^(\+?8801|01)\d+/.test(val.replace(/[\s-]/g, "")));
    const systemReceiver =
      (settings.paymentNumbers as any)?.[parsed.provider.toLowerCase()]?.number ||
      (settings.fallbackPaymentNumbers as any)?.[parsed.provider.toLowerCase()];

    const receiverPhone =
      (isPhoneNumber(explicitReceiver) ? explicitReceiver : undefined) ||
      (isPhoneNumber(parsed.receiver) ? parsed.receiver : undefined) ||
      systemReceiver ||
      "সিস্টেম নম্বর";

    const sender = parsed.sender || senderPhone || "অনুল্লেখিত / গোপন";

    // 2. Check for duplicate SMS event by fingerprint OR (provider + transactionId)
    const existing = await PaymentSmsEventModel.findOne({
      $or: [
        { smsFingerprint },
        { provider: parsed.provider, transactionId: cleanTrxId },
      ],
    });
    if (existing) {
      const existingBdTime = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Dhaka",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }).format(existing.receivedAt || new Date());

      return {
        success: true,
        isDuplicate: true,
        provider: existing.provider,
        transactionId: existing.transactionId,
        amount: poishaToBdt(existing.amount),
        senderPhone: existing.sender || sender,
        receiverPhone: existing.receiver || receiverPhone,
        timeBd: existingBdTime,
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
      sender,
      receiver: receiverPhone,
      reference: parsed.reference,
      receivedAt: parsed.receivedAt || new Date(),
      smsFingerprint,
      rawSms: smsContent.trim(),
      parserVersion: "2.1.0",
      verificationStatus: SmsEventVerificationStatus.UNUSED,
    });

    // 4. Auto-match with any pending user top-up
    let matched = false;
    let matchedUserPhone: string | undefined;
    try {
      const matchResult = await topUpService.autoMatchPendingTopUp(event);
      if (matchResult && (matchResult.success || event.verificationStatus === SmsEventVerificationStatus.MATCHED)) {
        matched = true;
        matchedUserPhone = matchResult.customerPhone;
      }
    } catch (err) {
      logger.warn({ err, eventId: event._id }, "Failed to auto-match pending topup on webhook ingestion");
    }

    // 5. Send Telegram notification if incoming from background forwarder
    if (source === "FORWARDER_WEBHOOK") {
      try {
        const botToken =
          settings.smsIntegration?.telegramBotToken ||
          process.env.TELEGRAM_BOT_TOKEN ||
          "8974788916:AAEvyNJ3JOO0PPHI9UwPwXNp01T4HJ6XxdA";
        const targetChatIds = Array.from(
          new Set(
            [
              settings.smsIntegration?.telegramChatId,
              process.env.TELEGRAM_ADMIN_CHAT_ID,
              process.env.TELEGRAM_PERSONAL_CHAT_ID,
              "-1004457142501",
            ].filter((id): id is string => Boolean(id && id !== "99999999"))
          )
        );

        if (settings.smsIntegration?.isTelegramEnabled !== false && botToken && targetChatIds.length > 0 && !matched) {
          const text =
            `📥 <b>নতুন পেমেন্ট SMS গৃহীত হয়েছে!</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `💰 <b>মাধ্যম:</b> ${parsed.provider}\n` +
            `🆔 <b>TrxID:</b> <code>${parsed.transactionId.toUpperCase()}</code>\n` +
            `💵 <b>পরিমাণ:</b> ৳${poishaToBdt(parsed.amount).toFixed(2)}\n` +
            `📱 <b>প্রেরক নম্বর:</b> <code>${sender}</code>\n` +
            `📥 <b>প্রাপক নম্বর:</b> ${receiverPhone}\n` +
            `🕒 <b>লেনদেন সময়:</b> ${timeBd}\n` +
            `📊 <b>স্ট্যাটাস:</b> 🟡 পেন্ডিং (PENDING / UNUSED)\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `✉️ <b>সম্পূর্ণ SMS:</b>\n<code>${smsContent.trim()}</code>\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `ℹ️ কাস্টমার টাকা পাঠিয়ে অ্যাপ থেকে ভেরিফাই করলে স্বয়ংক্রিয়ভাবে ব্যালেন্স যোগ হবে।`;

          for (const cid of targetChatIds) {
            await this.sendTelegramRawMessage(botToken, cid, text, "HTML").catch(() => {});
          }
        }
      } catch (_) {}
    }

    return {
      success: true,
      isDuplicate: false,
      provider: parsed.provider,
      transactionId: parsed.transactionId.toUpperCase(),
      amount: poishaToBdt(parsed.amount),
      senderPhone: sender,
      receiverPhone,
      timeBd,
      matched,
      matchedUserPhone,
      verificationStatus: event.verificationStatus,
      message: matched
        ? "SMS সফলভাবে ভেরিফাই হয়ে কাস্টমারের ওয়ালেটে ক্রেডিট হয়েছে"
        : "SMS সফলভাবে সিস্টেমে যুক্ত হয়েছে (কাস্টমার রিকোয়েস্টের জন্য অপেক্ষমাণ)",
    };
  },

  /**
   * Send Telegram message via Bot API with fallback
   */
  async sendTelegramRawMessage(botToken: string, chatId: string, text: string, parseMode: "HTML" | "Markdown" = "HTML") {
    if (!botToken || !chatId) return;
    try {
      const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: parseMode,
        }),
      });

      if (!res.ok) {
        // Fallback to plain text if markup parsing failed
        const plainText = text.replace(/<[^>]*>/g, "").replace(/[*_`#\[\]]/g, "");
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: plainText,
          }),
        });
      }
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

    // Auto-save admin chat ID if not set or dummy
    if (chatId && chatId !== "99999999") {
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
        let replyText = "";
        if (result.matched) {
          replyText =
            `🎉 *পেমেন্ট সফলভাবে ভেরিফাইড হয়েছে!*\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `💰 *মাধ্যম:* ${result.provider}\n` +
            `🆔 *TrxID:* \`${result.transactionId}\`\n` +
            `💵 *পরিমাণ:* ৳${result.amount.toFixed(2)}\n` +
            `📱 *প্রেরক নম্বর:* ${result.senderPhone}\n` +
            `📥 *প্রাপক নম্বর:* ${result.receiverPhone}\n` +
            (result.matchedUserPhone ? `👤 *কাস্টমার মোবাইল:* ${result.matchedUserPhone}\n` : "") +
            `🕒 *সময়:* ${result.timeBd}\n` +
            `📊 *স্ট্যাটাস:* 🟢 ভেরিফাইড (VERIFIED)\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `✅ কাস্টমার অ্যাকাউন্টে টাকা ক্রেডিট সম্পন্ন হয়েছে!`;
        } else if (result.isDuplicate) {
          replyText =
            `⚠️ *ডুপ্লিকেট ট্রানজেকশন!*\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `💰 *মাধ্যম:* ${result.provider}\n` +
            `🆔 *TrxID:* \`${result.transactionId}\`\n` +
            `💵 *পরিমাণ:* ৳${result.amount.toFixed(2)}\n` +
            `📱 *প্রেরক নম্বর:* ${result.senderPhone}\n` +
            `📥 *প্রাপক নম্বর:* ${result.receiverPhone}\n` +
            `🕒 *সময়:* ${result.timeBd}\n` +
            `📊 *স্ট্যাটাস:* 🔴 ইতিমধ্যে ব্যবহৃত (ALREADY USED)\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `ℹ️ এই TrxID দিয়ে আগেই ব্যালেন্স যোগ করা হয়েছে।`;
        } else {
          replyText =
            `📥 *নতুন পেমেন্ট SMS গৃহীত হয়েছে!*\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `💰 *মাধ্যম:* ${result.provider}\n` +
            `🆔 *TrxID:* \`${result.transactionId}\`\n` +
            `💵 *পরিমাণ:* ৳${result.amount.toFixed(2)}\n` +
            `📱 *প্রেরক নম্বর:* ${result.senderPhone}\n` +
            `📥 *প্রাপক নম্বর:* ${result.receiverPhone}\n` +
            `🕒 *লেনদেন সময়:* ${result.timeBd}\n` +
            `📊 *স্ট্যাটাস:* 🟡 পেন্ডিং (PENDING / UNUSED)\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `ℹ️ কাস্টমার টাকা পাঠিয়ে অ্যাপ থেকে ভেরিফাই করলে স্বয়ংক্রিয়ভাবে ব্যালেন্স যোগ হবে এবং তখন ভেরিফাইড (VERIFIED) কনফার্মেশন পাবেন।`;
        }
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
