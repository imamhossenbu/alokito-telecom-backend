import argon2 from "argon2";
import { Types } from "mongoose";
import { OperatorModel } from "../../modules/operators/operator.model";
import { UserModel } from "../../modules/users/user.model";
import { WalletModel } from "../../modules/wallets/wallet.model";
import { DriveOfferModel } from "../../modules/driveOffers/driveOffer.model";
import { OrderModel } from "../../modules/orders/order.model";
import { PaymentDeviceModel } from "../../modules/paymentDevices/paymentDevice.model";
import { WalletTransactionModel } from "../../modules/walletTransactions/walletTransaction.model";
import { bdtToPoisha } from "./money";
import { logger } from "../../config/logger";

export async function seedInitialData(): Promise<void> {
  try {
    // ── 1. Seed Operators with real prefixes & USSD codes ──
    const operatorsData = [
      { name: "Grameenphone", code: "GP", prefixes: ["017", "013"], ussdBalance: "*566#", ussdOffer: "*121#", sortOrder: 1, status: "ACTIVE" },
      { name: "Robi", code: "ROBI", prefixes: ["018"], ussdBalance: "*222#", ussdOffer: "*999#", sortOrder: 2, status: "ACTIVE" },
      { name: "Airtel", code: "AIRTEL", prefixes: ["016"], ussdBalance: "*778#", ussdOffer: "*121#", sortOrder: 3, status: "ACTIVE" },
      { name: "Banglalink", code: "BANGLALINK", prefixes: ["019", "014"], ussdBalance: "*124#", ussdOffer: "*888#", sortOrder: 4, status: "ACTIVE" },
      { name: "Teletalk", code: "TELETALK", prefixes: ["015"], ussdBalance: "*152#", ussdOffer: "*111#", sortOrder: 5, status: "ACTIVE" },
    ];

    const operatorMap: Record<string, any> = {};
    for (const op of operatorsData) {
      let existing = await OperatorModel.findOne({ code: op.code });
      if (!existing) {
        existing = await OperatorModel.create(op);
      }
      operatorMap[op.code] = existing;
    }

    // ── 2. Seed Demo Users & Wallets only if explicitly requested ──────
    if (process.env.SEED_DEMO_DATA !== "true") {
      logger.info("✅ Essential seed data (operators & admin) verified successfully");
      return;
    }

    const defaultPinHash = await argon2.hash("1234");
    const demoUsers = [
      {
        name: "Rakib Hasan",
        email: "rakib@gmail.com",
        emailNormalized: "rakib@gmail.com",
        phone: "01712345678",
        pinHash: defaultPinHash,
        district: "Dhaka",
        address: "Mirpur 10, Dhaka",
        accountStatus: "ACTIVE",
        createdByType: "SELF",
      },
      {
        name: "Sadia Akter",
        email: "sadia@gmail.com",
        emailNormalized: "sadia@gmail.com",
        phone: "01812345678",
        pinHash: defaultPinHash,
        district: "Chittagong",
        address: "GEC Circle, Chittagong",
        accountStatus: "ACTIVE",
        createdByType: "SELF",
      },
      {
        name: "Tanvir Ahmed",
        email: "tanvir@gmail.com",
        emailNormalized: "tanvir@gmail.com",
        phone: "01912345678",
        pinHash: defaultPinHash,
        district: "Sylhet",
        address: "Zindabazar, Sylhet",
        accountStatus: "ACTIVE",
        createdByType: "SELF",
      },
      {
        name: "Mehedi Hasan",
        email: "mehedi@gmail.com",
        emailNormalized: "mehedi@gmail.com",
        phone: "01612345678",
        pinHash: defaultPinHash,
        district: "Rajshahi",
        address: "Shaheb Bazar, Rajshahi",
        accountStatus: "BLOCKED",
        createdByType: "SELF",
      },
      {
        name: "Farhana Islam",
        email: "farhana@gmail.com",
        emailNormalized: "farhana@gmail.com",
        phone: "01512345678",
        pinHash: defaultPinHash,
        district: "Khulna",
        address: "Shibbari, Khulna",
        accountStatus: "ACTIVE",
        createdByType: "SELF",
      },
    ];

    const usersList: any[] = [];
    for (const u of demoUsers) {
      let user = await UserModel.findOne({ emailNormalized: u.emailNormalized });
      if (!user) {
        user = await UserModel.create(u);
      }
      usersList.push(user);

      // Ensure wallet
      let wallet = await WalletModel.findOne({ userId: user._id });
      if (!wallet) {
        wallet = await WalletModel.create({
          userId: user._id,
          balance: bdtToPoisha(5000),
          holdBalance: 0,
          totalTopUp: bdtToPoisha(15000),
          totalSpent: bdtToPoisha(10000),
        });
      }
    }

    // ── 3. Seed Drive Offers ──────────────────────────────
    const sampleOffers = [
      {
        operatorId: operatorMap["ROBI"]?._id,
        offerName: "Robi Family Pack 70GB + 1200 Min",
        category: "BUNDLE",
        offerType: "Family Pack",
        offerValue: "70GB + 1200M",
        validity: "30 Days",
        purchasePrice: bdtToPoisha(499),
        sellingPrice: bdtToPoisha(749),
        regularPrice: bdtToPoisha(899),
        activationCode: "*123*70#",
        description: "30 days nationwide validity with 150 TK cashback",
        status: "ACTIVE",
      },
      {
        operatorId: operatorMap["AIRTEL"]?._id,
        offerName: "Airtel MyPack 50GB + 800 Min",
        category: "BUNDLE",
        offerType: "MyPack",
        offerValue: "50GB + 800M",
        validity: "30 Days",
        purchasePrice: bdtToPoisha(380),
        sellingPrice: bdtToPoisha(580),
        regularPrice: bdtToPoisha(699),
        activationCode: "*121*50#",
        description: "High speed 4G internet with full network coverage",
        status: "ACTIVE",
      },
      {
        operatorId: operatorMap["GP"]?._id,
        offerName: "GP Super Internet 40GB",
        category: "INTERNET",
        offerType: "Internet Pack",
        offerValue: "40GB",
        validity: "30 Days",
        purchasePrice: bdtToPoisha(420),
        sellingPrice: bdtToPoisha(599),
        regularPrice: bdtToPoisha(799),
        activationCode: "*121*40#",
        description: "Official Grameenphone high volume pack",
        status: "ACTIVE",
      },
      {
        operatorId: operatorMap["BANGLALINK"]?._id,
        offerName: "BL Unlimited Combo 60GB + 1000 Min",
        category: "BUNDLE",
        offerType: "Recharge Pack",
        offerValue: "60GB + 1000M",
        validity: "30 Days",
        purchasePrice: bdtToPoisha(450),
        sellingPrice: bdtToPoisha(649),
        regularPrice: bdtToPoisha(799),
        activationCode: "*121*60#",
        description: "Banglalink special combo offer for all subscribers",
        status: "ACTIVE",
      },
      {
        operatorId: operatorMap["TELETALK"]?._id,
        offerName: "Teletalk Bornomala 30GB + 500 Min",
        category: "BUNDLE",
        offerType: "Standard Pack",
        offerValue: "30GB + 500M",
        validity: "30 Days",
        purchasePrice: bdtToPoisha(250),
        sellingPrice: bdtToPoisha(350),
        regularPrice: bdtToPoisha(450),
        activationCode: "*111*30#",
        description: "Teletalk budget pack with special tariff",
        status: "ACTIVE",
      },
      {
        operatorId: operatorMap["SKITTO"]?._id,
        offerName: "Skitto Super Reload 50GB",
        category: "INTERNET",
        offerType: "Promo Deal",
        offerValue: "50GB",
        validity: "30 Days",
        purchasePrice: bdtToPoisha(350),
        sellingPrice: bdtToPoisha(450),
        regularPrice: bdtToPoisha(550),
        activationCode: "*121*55#",
        description: "Special Skitto heavy data reload pack",
        status: "ACTIVE",
      },
      {
        operatorId: operatorMap["GP"]?._id,
        offerName: "GP Voice Pack 800 Minutes",
        category: "MINUTES",
        offerType: "Minutes Pack",
        offerValue: "800 Minutes",
        validity: "30 Days",
        purchasePrice: bdtToPoisha(350),
        sellingPrice: bdtToPoisha(475),
        activationCode: "*121*800#",
        description: "Any local network minutes with 30 days validity",
        status: "ACTIVE",
      },
    ];

    const offerList: any[] = [];
    for (const off of sampleOffers) {
      if (!off.operatorId) continue;
      let existing = await DriveOfferModel.findOne({ offerName: off.offerName });
      if (!existing) {
        existing = await DriveOfferModel.create(off);
      }
      offerList.push(existing);
    }

    // ── 4. Seed Orders ────────────────────────────────────
    const existingOrdersCount = await OrderModel.countDocuments();
    if (existingOrdersCount === 0 && usersList.length > 0 && offerList.length > 0) {
      const demoOrders = [
        {
          orderNumber: "OD-817562",
          transactionId: "TXN81756201",
          userId: usersList[0]._id,
          userPhone: usersList[0].phone,
          operatorId: operatorMap["ROBI"]._id,
          offerId: offerList[0]._id,
          offerType: "DRIVE",
          offerName: "Robi 800 Minutes",
          offerValue: "800M",
          validity: "30 Days",
          price: bdtToPoisha(455),
          paymentMethod: "WALLET",
          orderSource: "CUSTOMER",
          orderStatus: "ACTIVATION_PENDING",
          activationStatus: "PENDING",
        },
        {
          orderNumber: "OD-817561",
          transactionId: "TXN81756102",
          userId: usersList[1]._id,
          userPhone: usersList[1].phone,
          operatorId: operatorMap["AIRTEL"]._id,
          offerId: offerList[1]._id,
          offerType: "DRIVE",
          offerName: "Airtel 50GB Internet",
          offerValue: "50GB",
          validity: "30 Days",
          price: bdtToPoisha(499),
          paymentMethod: "WALLET",
          orderSource: "CUSTOMER",
          orderStatus: "ACTIVATION_PENDING",
          activationStatus: "PENDING",
        },
        {
          orderNumber: "OD-817560",
          transactionId: "TXN81756003",
          userId: usersList[2]._id,
          userPhone: usersList[2].phone,
          operatorId: operatorMap["GP"]._id,
          offerId: offerList[2]._id,
          offerType: "DRIVE",
          offerName: "GP 40GB Super Pack",
          offerValue: "40GB",
          validity: "30 Days",
          price: bdtToPoisha(599),
          paymentMethod: "WALLET",
          orderSource: "CUSTOMER",
          orderStatus: "PROCESSING",
          activationStatus: "PROCESSING",
        },
        {
          orderNumber: "OD-817559",
          transactionId: "TXN81755904",
          userId: usersList[0]._id,
          userPhone: usersList[0].phone,
          operatorId: operatorMap["BANGLALINK"]._id,
          offerId: offerList[3]._id,
          offerType: "DRIVE",
          offerName: "BL 60GB Combo",
          offerValue: "60GB",
          validity: "30 Days",
          price: bdtToPoisha(649),
          paymentMethod: "WALLET",
          orderSource: "CUSTOMER",
          orderStatus: "COMPLETED",
          activationStatus: "COMPLETED",
          completedAt: new Date(),
        },
        {
          orderNumber: "OD-817558",
          transactionId: "TXN81755805",
          userId: usersList[3]._id,
          userPhone: usersList[3].phone,
          operatorId: operatorMap["ROBI"]._id,
          offerId: offerList[0]._id,
          offerType: "DRIVE",
          offerName: "Robi Family Pack 70GB",
          offerValue: "70GB",
          validity: "30 Days",
          price: bdtToPoisha(749),
          paymentMethod: "WALLET",
          orderSource: "CUSTOMER",
          orderStatus: "REFUNDED",
          activationStatus: "FAILED",
          refundReason: "Customer requested cancellation due to wrong operator number",
        },
        {
          orderNumber: "OD-817557",
          transactionId: "TXN81755706",
          userId: usersList[4]._id,
          userPhone: usersList[4].phone,
          operatorId: operatorMap["TELETALK"]._id,
          offerId: offerList[4]._id,
          offerType: "DRIVE",
          offerName: "Teletalk Bornomala 30GB",
          offerValue: "30GB",
          validity: "30 Days",
          price: bdtToPoisha(350),
          paymentMethod: "WALLET",
          orderSource: "CUSTOMER",
          orderStatus: "CANCELLED",
          activationStatus: "FAILED",
          failureReason: "Operator system timeout",
        },
      ];

      for (const ord of demoOrders) {
        await OrderModel.create(ord);
      }
    }

    // ── 5. Seed Payment Listener Device ───────────────────
    const existingDevice = await PaymentDeviceModel.findOne();
    if (!existingDevice) {
      await PaymentDeviceModel.create({
        deviceName: "Primary SMS Listener",
        paymentProvider: "BKASH",
        phoneNumber: "01712345678",
        deviceSecretHash: await argon2.hash("device_secret_123"),
        status: "CONNECTED",
        lastHeartbeatAt: new Date(),
        simSlot: 1,
        networkOperator: "Grameenphone",
        batteryLevel: 94,
        appVersion: "1.2.0",
      });
    }

    // ── 6. Seed Wallet Transactions ─────────────────────────
    const txCount = await WalletTransactionModel.countDocuments();
    if (txCount === 0 && usersList.length > 0) {
      const u0 = usersList[0];
      const u1 = usersList[1];
      const u2 = usersList[2];
      const u3 = usersList[3];

      const w0 = await WalletModel.findOne({ userId: u0._id });
      const w1 = await WalletModel.findOne({ userId: u1._id });
      const w2 = await WalletModel.findOne({ userId: u2._id });
      const w3 = await WalletModel.findOne({ userId: u3._id });

      const sampleTransactions = [
        {
          userId: u0._id,
          walletId: w0?._id || new Types.ObjectId(),
          transactionId: "TX-1001",
          type: "TOP_UP",
          direction: "CREDIT",
          amount: bdtToPoisha(5000),
          balanceBefore: bdtToPoisha(19850),
          balanceAfter: bdtToPoisha(24850),
          referenceType: "TOP_UP",
          referenceId: new Types.ObjectId(),
          description: "Money Added via bKash • 01712345678",
          createdAt: new Date(Date.now() - 3600000 * 2),
        },
        {
          userId: u3._id,
          walletId: w3?._id || new Types.ObjectId(),
          transactionId: "TX-1002",
          type: "REFUND",
          direction: "CREDIT",
          amount: bdtToPoisha(749),
          balanceBefore: bdtToPoisha(5451),
          balanceAfter: bdtToPoisha(6200),
          referenceType: "REFUND",
          referenceId: new Types.ObjectId(),
          description: "Order Refund: Robi Family Pack 70GB",
          createdAt: new Date(Date.now() - 3600000 * 4),
        },
        {
          userId: u1._id,
          walletId: w1?._id || new Types.ObjectId(),
          transactionId: "TX-1003",
          type: "PURCHASE",
          direction: "DEBIT",
          amount: bdtToPoisha(649),
          balanceBefore: bdtToPoisha(8649),
          balanceAfter: bdtToPoisha(8000),
          referenceType: "ORDER",
          referenceId: new Types.ObjectId(),
          description: "Drive Purchase: BL 60GB Combo",
          createdAt: new Date(Date.now() - 3600000 * 8),
        },
        {
          userId: u2._id,
          walletId: w2?._id || new Types.ObjectId(),
          transactionId: "TX-1004",
          type: "TOP_UP",
          direction: "CREDIT",
          amount: bdtToPoisha(2000),
          balanceBefore: bdtToPoisha(6000),
          balanceAfter: bdtToPoisha(8000),
          referenceType: "TOP_UP",
          referenceId: new Types.ObjectId(),
          description: "Money Added via Nagad • 01912345678",
          createdAt: new Date(Date.now() - 3600000 * 12),
        },
        {
          userId: u2._id,
          walletId: w2?._id || new Types.ObjectId(),
          transactionId: "TX-1005",
          type: "PURCHASE",
          direction: "DEBIT",
          amount: bdtToPoisha(599),
          balanceBefore: bdtToPoisha(8000),
          balanceAfter: bdtToPoisha(7401),
          referenceType: "ORDER",
          referenceId: new Types.ObjectId(),
          description: "Drive Purchase: GP 40GB Super Pack",
          createdAt: new Date(Date.now() - 3600000 * 15),
        },
      ];

      for (const tx of sampleTransactions) {
        await WalletTransactionModel.create(tx);
      }
    }

    logger.info("✅ Initial seed data verified / created successfully");
  } catch (err) {
    logger.error({ err }, "Error in seedInitialData");
  }
}
