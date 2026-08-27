import { Router } from "express";
import { refundController } from "./refund.controller";
import { authMiddleware } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../shared/utils/async-handler";

const router = Router();

router.get("/", authMiddleware, asyncHandler(refundController.getCustomerRefunds));
router.get("/:id", authMiddleware, asyncHandler(refundController.getCustomerRefundById));

export default router;
