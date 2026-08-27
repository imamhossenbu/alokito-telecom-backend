import { Router } from "express";
import { operatorController } from "./operator.controller";
import { authMiddleware } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../shared/utils/async-handler";

const router = Router();

router.get("/", authMiddleware, asyncHandler(operatorController.getActiveOperators));
router.get("/:id", authMiddleware, asyncHandler(operatorController.getActiveOperatorById));

export default router;
