import { Router } from "express";
import { topUpController } from "./topup.controller";
import { authMiddleware } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../shared/utils/async-handler";

const router = Router();

router.post("/", authMiddleware, asyncHandler(topUpController.createTopUp));
router.post("/:id/verify", authMiddleware, asyncHandler(topUpController.verifyTopUp));
router.get("/", authMiddleware, asyncHandler(topUpController.getTopUps));
router.get("/:id", authMiddleware, asyncHandler(topUpController.getTopUpById));

export default router;
