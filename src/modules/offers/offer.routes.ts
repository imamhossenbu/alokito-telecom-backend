import { Router } from "express";
import { offerController } from "./offer.controller";
import { authMiddleware } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../shared/utils/async-handler";

const router = Router();

router.get("/", authMiddleware, asyncHandler(offerController.getActiveOffers));
router.get("/:id", authMiddleware, asyncHandler(offerController.getActiveOfferById));

export default router;
