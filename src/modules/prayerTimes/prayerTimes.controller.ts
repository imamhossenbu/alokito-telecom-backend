import { Request, Response } from "express";
import { prayerTimesService, BANGLADESH_DISTRICTS } from "./prayerTimes.service";
import { sendSuccess } from "../../shared/utils/api-response";

export const prayerTimesController = {
  getPrayerTimes(req: Request, res: Response) {
    let lat: number | undefined = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
    let lng: number | undefined = req.query.lng ? parseFloat(req.query.lng as string) : undefined;
    const districtQuery = (req.query.district as string) || "dhaka";

    let district = prayerTimesService.getDistrictCoord(districtQuery);

    if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng)) {
      lat = district.lat;
      lng = district.lng;
    }

    const now = new Date();
    const result = prayerTimesService.calculatePrayerTimes(lat, lng, now);

    sendSuccess(res, {
      data: {
        district: district.name,
        districtBn: district.bnName,
        lat,
        lng,
        date: now.toLocaleDateString("en-US", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        timings: result.timings,
        currentPrayer: result.currentPrayer,
        currentPrayerBn: result.currentPrayerBn,
        nextPrayer: result.nextPrayer,
        nextPrayerBn: result.nextPrayerBn,
        nextPrayerTime: result.nextPrayerTime,
        countdownSeconds: result.countdownSeconds,
      },
    });
  },

  getDistricts(_req: Request, res: Response) {
    const list = Object.values(BANGLADESH_DISTRICTS).map((d) => ({
      name: d.name,
      bnName: d.bnName,
      lat: d.lat,
      lng: d.lng,
    }));
    sendSuccess(res, { data: list });
  },
};
