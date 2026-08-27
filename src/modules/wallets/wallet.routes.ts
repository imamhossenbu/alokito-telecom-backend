import { Router } from "express";
import { walletController } from "./wallet.controller";
import { authMiddleware } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../shared/utils/async-handler";

const router = Router();

router.get("/", authMiddleware, asyncHandler(walletController.getWallet));
router.get("/transactions", authMiddleware, asyncHandler(walletController.getTransactions));
router.get("/transactions/:id", authMiddleware, asyncHandler(walletController.getTransactionById));

export default router;
