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

export interface ISystemSettings extends Document {
  verificationMode: VerificationMode;
  fallbackPaymentNumbers: {
    bkash: string;
    nagad: string;
    rocket: string;
    upay: string;
  };
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
        downloadUrl: { type: String, default: "https://alokito-telecom-backend-1.onrender.com/download/customer" },
        forceUpdate: { type: Boolean, default: false },
        releaseNotes: { type: String, default: "নতুন ড্রাইভ অফার, ব্যালেন্স অটো-ভেরিফিকেশন ও স্বয়ংক্রিয় অ্যাপ আপডেট সুবিধা।" },
      },
      admin: {
        latestVersion: { type: String, default: "1.0.3" },
        buildNumber: { type: Number, default: 4 },
        downloadUrl: { type: String, default: "https://alokito-telecom-backend-1.onrender.com/download/admin" },
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
