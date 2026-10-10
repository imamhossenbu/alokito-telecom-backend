import { Request, Response } from "express";
import { systemSettingsService } from "./systemSettings.service";
import { sendSuccess } from "../../shared/utils/api-response";
import { UnauthorizedError } from "../../shared/errors/app-error";

export const systemSettingsController = {
  async getPublicSettings(req: Request, res: Response) {
    const settings = await systemSettingsService.getSettings();
    const rawStatus = (settings.serviceStatus || {}) as any;
    const isPrayerActive = Boolean(rawStatus.prayerBreak?.active ?? (typeof rawStatus.prayerBreak === 'boolean' ? rawStatus.prayerBreak : false));
    const isNightActive = Boolean(rawStatus.nightBreak?.active ?? (typeof rawStatus.nightBreak === 'boolean' ? rawStatus.nightBreak : false));
    const isOffersClosed = Boolean(rawStatus.offersClosed?.active ?? (typeof rawStatus.offersClosed === 'boolean' ? rawStatus.offersClosed : false));
    const isNoticeActive = Boolean(rawStatus.noticeBanner?.active ?? (typeof rawStatus.noticeBanner === 'boolean' ? rawStatus.noticeBanner : false));

    const normalizedServiceStatus = {
      prayerBreak: isPrayerActive,
      prayerBreakNote: isPrayerActive ? (rawStatus.prayerBreak?.message || (typeof rawStatus.prayerBreakNote === 'string' ? rawStatus.prayerBreakNote : 'নামাজের বিরতি চলছে।')) : '',
      nightBreak: isNightActive,
      nightBreakNote: isNightActive ? (rawStatus.nightBreak?.message || (typeof rawStatus.nightBreakNote === 'string' ? rawStatus.nightBreakNote : 'রাতের বিরতি চলছে।')) : '',
      offersClosed: isOffersClosed,
      offersClosedNote: isOffersClosed ? (rawStatus.offersClosed?.message || (typeof rawStatus.offersClosedNote === 'string' ? rawStatus.offersClosedNote : 'আজকের মতো সকল ড্রাইভ অফার বন্ধ রয়েছে।')) : '',
      noticeBanner: isNoticeActive ? (rawStatus.noticeBanner?.message || (typeof rawStatus.noticeBanner === 'string' ? rawStatus.noticeBanner : '')) : '',
      noticeBannerTitle: isNoticeActive ? (rawStatus.noticeBanner?.title || 'জরুরী নোটিশ') : '',
    };

    sendSuccess(res, {
      data: {
        verificationMode: settings.verificationMode,
        fallbackPaymentNumbers: settings.fallbackPaymentNumbers,
        manualVerificationNote: settings.manualVerificationNote,
        serviceStatus: normalizedServiceStatus,
        appVersion: settings.appVersion,
      },
    });
  },

  async getAppVersion(req: Request, res: Response) {
    const appType = (req.query.app as string)?.toLowerCase() === "admin" ? "admin" : "customer";
    const settings = await systemSettingsService.getSettings();
    const versionData = settings.appVersion?.[appType] || {
      latestVersion: "1.0.3",
      buildNumber: 4,
      downloadUrl: "",
      forceUpdate: false,
      releaseNotes: "নতুন সংস্করণ আপডেট।",
    };
    sendSuccess(res, { data: versionData });
  },

  async adminGetSettings(req: Request, res: Response) {
    if (!req.actor || req.actor.type !== "ADMIN") {
      throw new UnauthorizedError();
    }
    const settings = await systemSettingsService.getSettings();
    sendSuccess(res, { data: settings });
  },

  async adminUpdateSettings(req: Request, res: Response) {
    if (!req.actor || req.actor.type !== "ADMIN") {
      throw new UnauthorizedError();
    }
    const settings = await systemSettingsService.updateSettings(req.body);
    sendSuccess(res, { data: settings });
  },
};
