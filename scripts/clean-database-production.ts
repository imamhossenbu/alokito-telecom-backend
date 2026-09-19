import mongoose from "mongoose";
import argon2 from "argon2";
import { env } from "../src/config/env";
import { UserModel } from "../src/modules/users/user.model";
import { WalletModel } from "../src/modules/wallets/wallet.model";
import { WalletTransactionModel } from "../src/modules/walletTransactions/walletTransaction.model";
import { OrderModel } from "../src/modules/orders/order.model";
import { DriveOfferModel } from "../src/modules/driveOffers/driveOffer.model";
import { TopUpModel } from "../src/modules/topups/topup.model";
import { RefundModel } from "../src/modules/refunds/refund.model";
import { PaymentDeviceModel } from "../src/modules/paymentDevices/paymentDevice.model";
import { OperatorModel } from "../src/modules/operators/operator.model";
import { AdminModel, AdminStatus } from "../src/modules/admins/admin.model";
import { normalizeEmail } from "../src/shared/utils/normalize";

async function cleanDatabaseForProduction() {
  console.log("======================================================");
  console.log("🧹 ALOKITO TELECOM: PRODUCTION DATABASE CLEANUP");
  console.log(`🎯 Connecting to MongoDB...`);
  console.log("======================================================");

  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log("✅ Connected to MongoDB successfully.\n");

    // 1. Delete Demo Data Collections
    console.log("🗑️  Cleaning Demo & Test Data...");
    
    const userRes = await UserModel.deleteMany({});
    console.log(`   - Users removed: ${userRes.deletedCount}`);

    const walletRes = await WalletModel.deleteMany({});
    console.log(`   - Wallets removed: ${walletRes.deletedCount}`);

    const txRes = await WalletTransactionModel.deleteMany({});
    console.log(`   - Wallet Transactions removed: ${txRes.deletedCount}`);

    const orderRes = await OrderModel.deleteMany({});
    console.log(`   - Orders removed: ${orderRes.deletedCount}`);

    const offerRes = await DriveOfferModel.deleteMany({});
    console.log(`   - Drive Offers removed: ${offerRes.deletedCount}`);

    const topUpRes = await TopUpModel.deleteMany({});
    console.log(`   - TopUp / Payment Requests removed: ${topUpRes.deletedCount}`);

    const refundRes = await RefundModel.deleteMany({});
    console.log(`   - Refund Records removed: ${refundRes.deletedCount}`);

    const deviceRes = await PaymentDeviceModel.deleteMany({});
    console.log(`   - Test SMS Devices removed: ${deviceRes.deletedCount}`);

    console.log("\n🌱 2. Ensuring Default Telecom Operators...");
    const defaultOperators = [
      { name: "Grameenphone", code: "GP", sortOrder: 1, status: "ACTIVE" },
      { name: "Robi", code: "ROBI", sortOrder: 2, status: "ACTIVE" },
      { name: "Airtel", code: "AIRTEL", sortOrder: 3, status: "ACTIVE" },
      { name: "Banglalink", code: "BANGLALINK", sortOrder: 4, status: "ACTIVE" },
      { name: "Teletalk", code: "TELETALK", sortOrder: 5, status: "ACTIVE" },
    ];

    for (const op of defaultOperators) {
      await OperatorModel.findOneAndUpdate(
        { code: op.code },
        { $set: op },
        { upsert: true, new: true }
      );
    }
    const opCount = await OperatorModel.countDocuments();
    console.log(`   ✅ Active Operators verified: ${opCount}`);

    console.log("\n👑 3. Ensuring Super Admin Accounts...");
    const defaultAdmins = [
      { name: "Super Admin", email: "admin@telecom.com", password: "admin123" },
      { name: "Drive Offer Admin", email: "admin@driveoffer.com", password: "admin1234" },
    ];

    for (const item of defaultAdmins) {
      const emailNorm = normalizeEmail(item.email);
      const hash = await argon2.hash(item.password);
      await AdminModel.findOneAndUpdate(
        { emailNormalized: emailNorm },
        {
          $set: {
            name: item.name,
            email: item.email,
            emailNormalized: emailNorm,
            passwordHash: hash,
            role: "ADMIN",
            status: AdminStatus.ACTIVE,
          },
        },
        { upsert: true, new: true }
      );
    }
    const adminCount = await AdminModel.countDocuments();
    console.log(`   ✅ Admin accounts active: ${adminCount}`);

    console.log("\n======================================================");
    console.log("🎉 DATABASE IS NOW 100% CLEAN & READY FOR PRODUCTION!");
    console.log("======================================================");
    console.log("📋 Admin Login Credentials:");
    console.log("   • Email: admin@telecom.com  | Password: admin123");
    console.log("   • Email: admin@driveoffer.com | Password: admin1234");
    console.log("======================================================\n");
  } catch (error) {
    console.error("❌ Error cleaning database:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 MongoDB disconnected.");
    process.exit(0);
  }
}

cleanDatabaseForProduction();
