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
            latestVersion: "1.0.4",
            buildNumber: 5,
            downloadUrl: "https://alokito-telecom-backend-1.onrender.com/download/customer",
            forceUpdate: false,
            releaseNotes: "নতুন ড্রাইভ অফার, ব্যালেন্স অটো-ভেরিফিকেশন ও স্বয়ংক্রিয় অ্যাপ আপডেট সুবিধা।",
          };
          needSave = true;
        } else {
          if (!settings.appVersion.customer.downloadUrl) {
            settings.appVersion.customer.downloadUrl = "https://alokito-telecom-backend-1.onrender.com/download/customer";
            needSave = true;
          }
          if ((settings.appVersion.customer.buildNumber || 0) < 5) {
            settings.appVersion.customer.buildNumber = 5;
            settings.appVersion.customer.latestVersion = "1.0.4";
            needSave = true;
          }
        }

        if (!settings.appVersion.admin) {
          settings.appVersion.admin = {
            latestVersion: "1.0.3",
            buildNumber: 4,
            downloadUrl: "https://alokito-telecom-backend-1.onrender.com/download/admin",
            forceUpdate: false,
            releaseNotes: "অ্যাডমিন রিয়েলটাইম নোটিফিকেশন অ্যালার্ট ও অর্ডার প্রসেসিং আপডেট।",
          };
          needSave = true;
        } else {
          if (!settings.appVersion.admin.downloadUrl) {
            settings.appVersion.admin.downloadUrl = "https://alokito-telecom-backend-1.onrender.com/download/admin";
            needSave = true;
          }
          if ((settings.appVersion.admin.buildNumber || 0) < 4) {
            settings.appVersion.admin.buildNumber = 4;
            settings.appVersion.admin.latestVersion = "1.0.3";
            needSave = true;
          }
        }
      }

      if (needSave) {
        settings.markModified("appVersion");
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
    manualVerificationNote?: string;
    prayerTimesDistrict?: string;
  }): Promise<ISystemSettings> {
    const settings = await this.getSettings();

    if (data.verificationMode) {
      settings.verificationMode = data.verificationMode;
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
      settings.serviceStatus = {
        prayerBreak: {
          ...settings.serviceStatus?.prayerBreak,
          ...(incoming.prayerBreak || {}),
        },
        nightBreak: {
          ...settings.serviceStatus?.nightBreak,
          ...(incoming.nightBreak || {}),
        },
        offersClosed: {
          ...settings.serviceStatus?.offersClosed,
          ...(incoming.offersClosed || {}),
        },
        noticeBanner: {
          ...settings.serviceStatus?.noticeBanner,
          ...(incoming.noticeBanner || {}),
        },
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
