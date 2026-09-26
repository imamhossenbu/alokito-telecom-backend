import mongoose, { Schema, Document } from "mongoose";

export enum VerificationMode {
  AUTO = "AUTO",
  MANUAL = "MANUAL",
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
  },
  { timestamps: true }
);

export const SystemSettingsModel = mongoose.model<ISystemSettings>(
  "SystemSettings",
  SystemSettingsSchema
);
