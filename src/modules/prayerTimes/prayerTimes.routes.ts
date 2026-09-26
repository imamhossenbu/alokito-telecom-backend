import { Router } from "express";
import { prayerTimesController } from "./prayerTimes.controller";

const router = Router();

router.get("/", prayerTimesController.getPrayerTimes);
router.get("/districts", prayerTimesController.getDistricts);

export default router;
