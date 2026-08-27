import { Router } from "express";
import { orderController } from "./order.controller";
import { authMiddleware } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../shared/utils/async-handler";

const router = Router();

router.post("/", authMiddleware, asyncHandler(orderController.createOrder));
router.get("/", authMiddleware, asyncHandler(orderController.getCustomerOrders));
router.get("/:id", authMiddleware, asyncHandler(orderController.getCustomerOrderById));

export default router;
