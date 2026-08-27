import { Router } from "express";
import { notificationController } from "./notification.controller";
import { authMiddleware } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../shared/utils/async-handler";

const router = Router();

router.get("/", authMiddleware, asyncHandler(notificationController.getNotifications));
router.get("/:id", authMiddleware, asyncHandler(notificationController.getNotificationById));
router.post("/:id/read", authMiddleware, asyncHandler(notificationController.markAsRead));
router.post("/read-all", authMiddleware, asyncHandler(notificationController.markAllAsRead));

export default router;
