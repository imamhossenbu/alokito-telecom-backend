import { SystemSettingsModel, VerificationMode, ISystemSettings } from "./systemSettings.model";

export class SystemSettingsService {
  private static instance: SystemSettingsService;

  private constructor() {}

  public static getInstance(): SystemSettingsService {
    if (!SystemSettingsService.instance) {
      SystemSettingsService.instance = new SystemSettingsService();
    }
    return SystemSettingsService.instance;
  }

  async getSettings(): Promise<ISystemSettings> {
    let settings = await SystemSettingsModel.findOne();
    if (!settings) {
      settings = await SystemSettingsModel.create({
        verificationMode: VerificationMode.AUTO,
        fallbackPaymentNumbers: {
          bkash: "01890000001",
          nagad: "01890000001",
          rocket: "01890000001",
          upay: "01890000001",
        },
        manualVerificationNote: "ম্যানুয়াল ভেরিফিকেশন মোড সক্রিয় রয়েছে। আপনার পেমেন্ট ট্রানজ্যাকশন এডমিন রিভিউ সাপেক্ষে দ্রুত ব্যালেন্স যুক্ত হবে।",
        appVersion: {
          customer: {
            latestVersion: "1.0.4",
            buildNumber: 5,
            downloadUrl: "https://alokito-telecom-backend-1.onrender.com/download/customer",
            forceUpdate: false,
            releaseNotes: "নতুন ড্রাইভ অফার, ব্যালেন্স অটো-ভেরিফিকেশন ও স্বয়ংক্রিয় অ্যাপ আপডেট সুবিধা।",
          },
          admin: {
            latestVersion: "1.0.3",
            buildNumber: 4,
            downloadUrl: "https://alokito-telecom-backend-1.onrender.com/download/admin",
            forceUpdate: false,
            releaseNotes: "অ্যাডমিন রিয়েলটাইম নোটিফিকেশন অ্যালার্ট ও অর্ডার প্রসেসিং আপডেট।",
          },
        },
      });
    } else {
      let needSave = false;
      if (!settings.appVersion) {
        settings.appVersion = {
          customer: {
            latestVersion: "1.0.4",
            buildNumber: 5,
            downloadUrl: "https://alokito-telecom-backend-1.onrender.com/download/customer",
            forceUpdate: false,
            releaseNotes: "নতুন ড্রাইভ অফার, ব্যালেন্স অটো-ভেরিফিকেশন ও স্বয়ংক্রিয় অ্যাপ আপডেট সুবিধা।",
          },
          admin: {
            latestVersion: "1.0.3",
            buildNumber: 4,
            downloadUrl: "https://alokito-telecom-backend-1.onrender.com/download/admin",
            forceUpdate: false,
            releaseNotes: "অ্যাডমিন রিয়েলটাইম নোটিফিকেশন অ্যালার্ট ও অর্ডার প্রসেসিং আপডেট।",
          },
        };
        needSave = true;
      } else {
        if (!settings.appVersion.customer) {
          settings.appVersion.customer = {
            latestVersion: "1.0.7",
            buildNumber: 8,
            downloadUrl: "https://alokito-telecom-backend-1.onrender.com/download/customer",
            forceUpdate: false,
            releaseNotes: "লেটেস্ট বিল্ড: ড্রাইভ অফার ক্যাটালগ, ফুল SMS ট্র্যাকিং এবং লাইভ সার্ভিস নোটিশ আপডেট।",
          };
          needSave = true;
        } else {
          if (!settings.appVersion.customer.downloadUrl) {
            settings.appVersion.customer.downloadUrl = "https://alokito-telecom-backend-1.onrender.com/download/customer";
            needSave = true;
          }
          if ((settings.appVersion.customer.buildNumber || 0) < 8) {
            settings.appVersion.customer.buildNumber = 8;
            settings.appVersion.customer.latestVersion = "1.0.7";
            settings.appVersion.customer.releaseNotes = "লেটেস্ট বিল্ড: ড্রাইভ অফার ক্যাটালগ, ফুল SMS ট্র্যাকিং এবং লাইভ সার্ভিস নোটিশ আপডেট।";
            needSave = true;
          }
        }

        if (!settings.appVersion.admin) {
          settings.appVersion.admin = {
            latestVersion: "1.0.7",
            buildNumber: 8,
            downloadUrl: "https://alokito-telecom-backend-1.onrender.com/download/admin",
            forceUpdate: false,
            releaseNotes: "লেটেস্ট বিল্ড: সঠিক বাংলাদেশ সময় (BST) টাইমজোন ফিক্স ও অর্ডার ম্যানেজমেন্ট আপডেট।",
          };
          needSave = true;
        } else {
          if (!settings.appVersion.admin.downloadUrl) {
            settings.appVersion.admin.downloadUrl = "https://alokito-telecom-backend-1.onrender.com/download/admin";
            needSave = true;
          }
          if ((settings.appVersion.admin.buildNumber || 0) < 8) {
            settings.appVersion.admin.buildNumber = 8;
            settings.appVersion.admin.latestVersion = "1.0.7";
            settings.appVersion.admin.releaseNotes = "লেটেস্ট বিল্ড: সঠিক বাংলাদেশ সময় (BST) টাইমজোন ফিক্স ও অর্ডার ম্যানেজমেন্ট আপডেট।";
            needSave = true;
          }
        }
      }

      if (!settings.contactSupport) {
        settings.contactSupport = {
          telegram: "https://t.me/alokito_telecom",
          whatsapp: "https://wa.me/8801890000001",
          facebook: "https://facebook.com",
          youtube: "https://youtube.com",
          offlinePhone: "01890000001",
        };
        needSave = true;
      } else if (!settings.contactSupport.telegram) {
        settings.contactSupport.telegram = "https://t.me/alokito_telecom";
        needSave = true;
      }

      if (!settings.paymentNumbers) {
        settings.paymentNumbers = {
          bkash: {
            number: settings.fallbackPaymentNumbers?.bkash || "01890000001",
            type: "Send Money (Personal)",
            active: true,
            instructions: "বিকাশ অ্যাপ বা *247# ডায়াল করে সেন্ড মানি করুন।",
          },
          nagad: {
            number: settings.fallbackPaymentNumbers?.nagad || "01890000001",
            type: "Send Money (Personal)",
            active: true,
            instructions: "নগদ অ্যাপ বা *167# ডায়াল করে সেন্ড মানি করুন।",
          },
          rocket: {
            number: settings.fallbackPaymentNumbers?.rocket || "01890000001",
            type: "Send Money (Personal)",
            active: true,
            instructions: "রকেট অ্যাপ বা *322# ডায়াল করে সেন্ড মানি করুন।",
          },
          upay: {
            number: settings.fallbackPaymentNumbers?.upay || "01890000001",
            type: "Send Money (Personal)",
            active: true,
            instructions: "উপায় অ্যাপ বা *268# ডায়াল করে সেন্ড মানি করুন।",
          },
        };
        needSave = true;
      }

      if (!settings.smsIntegration) {
        settings.smsIntegration = {
          telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || "8974788916:AAEvyNJ3JOO0PPHI9UwPwXNp01T4HJ6XxdA",
          telegramChatId: process.env.TELEGRAM_ADMIN_CHAT_ID || "-1004457142501",
          forwarderApiKey: "alokito_sms_forwarder_key_2026",
          isTelegramEnabled: true,
        };
        needSave = true;
      } else {
        if (!settings.smsIntegration.telegramBotToken) {
          settings.smsIntegration.telegramBotToken = process.env.TELEGRAM_BOT_TOKEN || "8974788916:AAEvyNJ3JOO0PPHI9UwPwXNp01T4HJ6XxdA";
          needSave = true;
        }
        if (!settings.smsIntegration.telegramChatId || settings.smsIntegration.telegramChatId === "99999999") {
          settings.smsIntegration.telegramChatId = process.env.TELEGRAM_ADMIN_CHAT_ID || "-1004457142501";
          needSave = true;
        }
        settings.smsIntegration.isTelegramEnabled = true;
      }

      if (needSave) {
        settings.markModified("appVersion");
        settings.markModified("contactSupport");
        settings.markModified("paymentNumbers");
        settings.markModified("smsIntegration");
        await settings.save().catch(() => {});
      }
    }
    return settings;
  }

  async updateSettings(data: {
    verificationMode?: VerificationMode;
    fallbackPaymentNumbers?: {
      bkash?: string;
      nagad?: string;
      rocket?: string;
      upay?: string;
    };
    paymentNumbers?: any;
    contactSupport?: any;
    smsIntegration?: any;
    manualVerificationNote?: string;
    prayerTimesDistrict?: string;
  }): Promise<ISystemSettings> {
    const settings = await this.getSettings();

    if (data.verificationMode) {
      settings.verificationMode = data.verificationMode;
    }
    if (data.paymentNumbers) {
      settings.paymentNumbers = {
        bkash: { ...settings.paymentNumbers?.bkash, ...(data.paymentNumbers.bkash || {}) },
        nagad: { ...settings.paymentNumbers?.nagad, ...(data.paymentNumbers.nagad || {}) },
        rocket: { ...settings.paymentNumbers?.rocket, ...(data.paymentNumbers.rocket || {}) },
        upay: { ...settings.paymentNumbers?.upay, ...(data.paymentNumbers.upay || {}) },
      };
      // Keep fallbackPaymentNumbers in sync
      settings.fallbackPaymentNumbers = {
        bkash: settings.paymentNumbers.bkash?.number || settings.fallbackPaymentNumbers?.bkash || "",
        nagad: settings.paymentNumbers.nagad?.number || settings.fallbackPaymentNumbers?.nagad || "",
        rocket: settings.paymentNumbers.rocket?.number || settings.fallbackPaymentNumbers?.rocket || "",
        upay: settings.paymentNumbers.upay?.number || settings.fallbackPaymentNumbers?.upay || "",
      };
      settings.markModified("paymentNumbers");
      settings.markModified("fallbackPaymentNumbers");
    }
    if (data.contactSupport) {
      settings.contactSupport = {
        telegram: data.contactSupport.telegram ?? settings.contactSupport?.telegram ?? "",
        whatsapp: data.contactSupport.whatsapp ?? settings.contactSupport?.whatsapp ?? "",
        facebook: data.contactSupport.facebook ?? settings.contactSupport?.facebook ?? "",
        youtube: data.contactSupport.youtube ?? settings.contactSupport?.youtube ?? "",
        offlinePhone: data.contactSupport.offlinePhone ?? settings.contactSupport?.offlinePhone ?? "",
      };
      settings.markModified("contactSupport");
    }
    if (data.smsIntegration) {
      settings.smsIntegration = {
        telegramBotToken: data.smsIntegration.telegramBotToken ?? settings.smsIntegration?.telegramBotToken ?? "",
        telegramChatId: data.smsIntegration.telegramChatId ?? settings.smsIntegration?.telegramChatId ?? "",
        forwarderApiKey: data.smsIntegration.forwarderApiKey ?? settings.smsIntegration?.forwarderApiKey ?? "alokito_sms_forwarder_key_2026",
        isTelegramEnabled: data.smsIntegration.isTelegramEnabled !== undefined ? Boolean(data.smsIntegration.isTelegramEnabled) : (settings.smsIntegration?.isTelegramEnabled || false),
      };
      settings.markModified("smsIntegration");
    }
    if (data.fallbackPaymentNumbers) {
      settings.fallbackPaymentNumbers = {
        ...settings.fallbackPaymentNumbers,
        ...data.fallbackPaymentNumbers,
      };

      // Also update any paired/registered PaymentDevice so both stay synchronized
      try {
        const { PaymentDeviceModel } = await import("../paymentDevices/paymentDevice.model");
        const activeDevice = await PaymentDeviceModel.findOne({
          status: { $in: ["CONNECTED", "PENDING", "OFFLINE"] }
        }).sort({ updatedAt: -1 });

        if (activeDevice) {
          const fb = settings.fallbackPaymentNumbers;
          if (fb.bkash) {
            if (activeDevice.sim1Providers?.toUpperCase().includes("BKASH") || !activeDevice.sim1PhoneNumber) {
              activeDevice.sim1PhoneNumber = fb.bkash;
              if (!activeDevice.sim1Providers) activeDevice.sim1Providers = "BKASH";
            } else if (activeDevice.sim2Providers?.toUpperCase().includes("BKASH")) {
              activeDevice.sim2PhoneNumber = fb.bkash;
            }
          }
          if (fb.nagad) {
            if (activeDevice.sim2Providers?.toUpperCase().includes("NAGAD") || (!activeDevice.sim2PhoneNumber && activeDevice.sim1PhoneNumber !== fb.nagad)) {
              activeDevice.sim2PhoneNumber = fb.nagad;
              if (!activeDevice.sim2Providers) activeDevice.sim2Providers = "NAGAD";
            } else if (activeDevice.sim1Providers?.toUpperCase().includes("NAGAD")) {
              activeDevice.sim1PhoneNumber = fb.nagad;
            }
          }
          if (fb.bkash && (!activeDevice.phoneNumber || !activeDevice.phoneNumber.includes(","))) {
            activeDevice.phoneNumber = fb.bkash;
          }
          await activeDevice.save();
        }
      } catch (_) {}
    }
    if (data.manualVerificationNote !== undefined) {
      settings.manualVerificationNote = data.manualVerificationNote;
    }
    if (data.prayerTimesDistrict !== undefined) {
      settings.prayerTimesDistrict = data.prayerTimesDistrict;
    }
    if ((data as any).serviceStatus) {
      const incoming = (data as any).serviceStatus;
      const parseItem = (
        existing: any,
        val: any,
        noteVal?: any,
        fallbackTitle = ""
      ) => {
        if (typeof val === "boolean") {
          return {
            active: val,
            title: existing?.title || fallbackTitle,
            message: noteVal !== undefined ? String(noteVal) : (existing?.message || ""),
          };
        }
        if (typeof val === "string") {
          return {
            active: val.trim().length > 0,
            title: existing?.title || fallbackTitle,
            message: val.trim(),
          };
        }
        if (typeof val === "object" && val !== null) {
          return {
            ...existing,
            ...val,
            active: val.active !== undefined ? Boolean(val.active) : Boolean(existing?.active),
          };
        }
        return existing || { active: false, title: fallbackTitle, message: "" };
      };

      settings.serviceStatus = {
        prayerBreak: parseItem(
          settings.serviceStatus?.prayerBreak,
          incoming.prayerBreak,
          incoming.prayerBreakNote,
          "নামাজের বিরতি চলছে"
        ),
        nightBreak: parseItem(
          settings.serviceStatus?.nightBreak,
          incoming.nightBreak,
          incoming.nightBreakNote,
          "রাতের বিরতি চলছে"
        ),
        offersClosed: parseItem(
          settings.serviceStatus?.offersClosed,
          incoming.offersClosed,
          incoming.offersClosedNote,
          "অফার সাময়িক বন্ধ"
        ),
        noticeBanner: parseItem(
          settings.serviceStatus?.noticeBanner,
          incoming.noticeBanner !== undefined ? incoming.noticeBanner : incoming.noticeBannerActive,
          incoming.noticeBannerNote || incoming.noticeBanner,
          "জরুরী নোটিশ"
        ),
      };
      settings.markModified("serviceStatus");
    }
    if ((data as any).appVersion) {
      const incoming = (data as any).appVersion;
      settings.appVersion = {
        customer: {
          ...settings.appVersion?.customer,
          ...(incoming.customer || {}),
        },
        admin: {
          ...settings.appVersion?.admin,
          ...(incoming.admin || {}),
        },
      };
      settings.markModified("appVersion");
    }

    await settings.save();
    return settings;
  }

  async isManualVerification(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.verificationMode === VerificationMode.MANUAL;
  }
}

export const systemSettingsService = SystemSettingsService.getInstance();
