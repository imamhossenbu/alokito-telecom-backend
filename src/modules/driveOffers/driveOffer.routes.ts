import { Router } from "express";
import { driveOfferController } from "./driveOffer.controller";
import { authMiddleware } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../shared/utils/async-handler";

const router = Router();

router.get("/", authMiddleware, asyncHandler(driveOfferController.getActiveOffers));
router.get("/:id", authMiddleware, asyncHandler(driveOfferController.getActiveOfferById));

export default router;
