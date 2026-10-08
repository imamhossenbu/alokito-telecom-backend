import { Router } from "express";
import { systemSettingsController } from "./systemSettings.controller";
import { asyncHandler } from "../../shared/utils/async-handler";
import { adminMiddleware } from "../../middleware/admin.middleware";

const router = Router();

router.get("/", asyncHandler(systemSettingsController.getPublicSettings));
router.get("/public", asyncHandler(systemSettingsController.getPublicSettings));
router.get("/app-version", asyncHandler(systemSettingsController.getAppVersion));
router.get("/admin", adminMiddleware, asyncHandler(systemSettingsController.adminGetSettings));
router.patch("/admin", adminMiddleware, asyncHandler(systemSettingsController.adminUpdateSettings));

export default router;
