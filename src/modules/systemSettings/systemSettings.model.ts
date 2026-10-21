import mongoose, { Schema, Document } from "mongoose";

export enum VerificationMode {
  AUTO = "AUTO",
  MANUAL = "MANUAL",
}

export interface IServiceStatusItem {
  active: boolean;
  title: string;
  message: string;
}

export interface IAppVersionItem {
  latestVersion: string;
  buildNumber: number;
  downloadUrl: string;
  forceUpdate: boolean;
  releaseNotes: string;
}

export interface IPaymentMethodConfig {
  number: string;
  type: string;
  active: boolean;
  instructions: string;
}

export interface IContactSupport {
  telegram: string;
  whatsapp: string;
  facebook: string;
  youtube: string;
  offlinePhone: string;
}

export interface ISmsIntegration {
  telegramBotToken: string;
  telegramChatId: string;
  forwarderApiKey: string;
  isTelegramEnabled: boolean;
}

export interface ISystemSettings extends Document {
  verificationMode: VerificationMode;
  fallbackPaymentNumbers: {
    bkash: string;
    nagad: string;
    rocket: string;
    upay: string;
  };
  paymentNumbers: {
    bkash: IPaymentMethodConfig;
    nagad: IPaymentMethodConfig;
    rocket: IPaymentMethodConfig;
    upay: IPaymentMethodConfig;
  };
  contactSupport: IContactSupport;
  smsIntegration: ISmsIntegration;
  manualVerificationNote: string;
  prayerTimesDistrict: string;
  serviceStatus: {
    prayerBreak: IServiceStatusItem;
    nightBreak: IServiceStatusItem;
    offersClosed: IServiceStatusItem;
    noticeBanner: IServiceStatusItem;
  };
  appVersion: {
    customer: IAppVersionItem;
    admin: IAppVersionItem;
  };
  updatedAt: Date;
  createdAt: Date;
}

const SystemSettingsSchema = new Schema<ISystemSettings>(
  {
    verificationMode: {
      type: String,
      enum: Object.values(VerificationMode),
      default: VerificationMode.AUTO,
    },
    fallbackPaymentNumbers: {
      bkash: { type: String, default: "01890000001" },
      nagad: { type: String, default: "01890000001" },
      rocket: { type: String, default: "01890000001" },
      upay: { type: String, default: "01890000001" },
    },
    paymentNumbers: {
      bkash: {
        number: { type: String, default: "01890000001" },
        type: { type: String, default: "Send Money (Personal)" },
        active: { type: Boolean, default: true },
        instructions: { type: String, default: "বিকাশ অ্যাপ বা *247# ডায়াল করে সেন্ড মানি করুন।" },
      },
      nagad: {
        number: { type: String, default: "01890000001" },
        type: { type: String, default: "Send Money (Personal)" },
        active: { type: Boolean, default: true },
        instructions: { type: String, default: "নগদ অ্যাপ বা *167# ডায়াল করে সেন্ড মানি করুন।" },
      },
      rocket: {
        number: { type: String, default: "01890000001" },
        type: { type: String, default: "Send Money (Personal)" },
        active: { type: Boolean, default: true },
        instructions: { type: String, default: "রকেট অ্যাপ বা *322# ডায়াল করে সেন্ড মানি করুন।" },
      },
      upay: {
        number: { type: String, default: "01890000001" },
        type: { type: String, default: "Send Money (Personal)" },
        active: { type: Boolean, default: true },
        instructions: { type: String, default: "উপায় অ্যাপ বা *268# ডায়াল করে সেন্ড মানি করুন।" },
      },
    },
    contactSupport: {
      telegram: { type: String, default: "https://t.me/alokito_telecom" },
      whatsapp: { type: String, default: "https://wa.me/8801890000001" },
      facebook: { type: String, default: "https://facebook.com" },
      youtube: { type: String, default: "https://youtube.com" },
      offlinePhone: { type: String, default: "01890000001" },
    },
    smsIntegration: {
      telegramBotToken: { type: String, default: "" },
      telegramChatId: { type: String, default: "" },
      forwarderApiKey: { type: String, default: "alokito_sms_forwarder_key_2026" },
      isTelegramEnabled: { type: Boolean, default: false },
    },
    manualVerificationNote: {
      type: String,
      default: "ম্যানুয়াল ভেরিফিকেশন মোড সক্রিয় রয়েছে। আপনার পেমেন্ট ট্রানজ্যাকশন এডমিন রিভিউ সাপেক্ষে দ্রুত ব্যালেন্স যুক্ত হবে।",
    },
    prayerTimesDistrict: { type: String, default: "Dhaka" },
    serviceStatus: {
      prayerBreak: {
        active: { type: Boolean, default: false },
        title: { type: String, default: "নামাজের বিরতি চলছে" },
        message: { type: String, default: "সম্মানিত গ্রাহক, নামাজের জন্য সাময়িক বিরতি চলছে। কিছুক্ষণের মধ্যে সেবা চালু হবে।" },
      },
      nightBreak: {
        active: { type: Boolean, default: false },
        title: { type: String, default: "রাতের বিরতি চলছে" },
        message: { type: String, default: "সম্মানিত গ্রাহক, রাতের বিরতির কারণে সেবা সাময়িক বন্ধ রয়েছে। সকাল ৮টা থেকে আবার সার্ভিস চালু হবে।" },
      },
      offersClosed: {
        active: { type: Boolean, default: false },
        title: { type: String, default: "অফার সাময়িক বন্ধ" },
        message: { type: String, default: "বর্তমানে সকল অফার কার্যক্রম সাময়িক স্থগিত আছে। শীঘ্রই পুনরায় চালু হবে।" },
      },
      noticeBanner: {
        active: { type: Boolean, default: false },
        title: { type: String, default: "জরুরী নোটিশ" },
        message: { type: String, default: "" },
      },
    },
    appVersion: {
      customer: {
        latestVersion: { type: String, default: "1.0.4" },
        buildNumber: { type: Number, default: 5 },
        downloadUrl: { type: String, default: "https://alokito-telecom-backend-sqgt.onrender.com/download/customer" },
        forceUpdate: { type: Boolean, default: false },
        releaseNotes: { type: String, default: "নতুন ড্রাইভ অফার, ব্যালেন্স অটো-ভেরিফিকেশন ও স্বয়ংক্রিয় অ্যাপ আপডেট সুবিধা।" },
      },
      admin: {
        latestVersion: { type: String, default: "1.0.3" },
        buildNumber: { type: Number, default: 4 },
        downloadUrl: { type: String, default: "https://alokito-telecom-backend-sqgt.onrender.com/download/admin" },
        forceUpdate: { type: Boolean, default: false },
        releaseNotes: { type: String, default: "অ্যাডমিন রিয়েলটাইম নোটিফিকেশন অ্যালার্ট ও অর্ডার প্রসেসিং আপডেট।" },
      },
    },
  },
  { timestamps: true }
);

export const SystemSettingsModel = mongoose.model<ISystemSettings>(
  "SystemSettings",
  SystemSettingsSchema
);
