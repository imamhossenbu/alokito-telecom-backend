import { Types } from "mongoose";
import { TopUpModel, TopUpDocument, TopUpStatus } from "./topup.model";
import { generateReferenceId, IdPrefix } from "../../shared/utils/id-generator";

export const topUpRepository = {
  findById(id: string | Types.ObjectId) {
    return TopUpModel.findById(id);
  },

  findByTopUpNumber(topUpNumber: string) {
    return TopUpModel.findOne({ topUpNumber });
  },

  create(data: Omit<Partial<TopUpDocument>, "topUpNumber">) {
    const topUpNumber = generateReferenceId(IdPrefix.TOP_UP);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min verification window
    return TopUpModel.create({ ...data, topUpNumber, expiresAt });
  },

  async findAll(userId: string | Types.ObjectId, page = 1, limit = 20) {
    const filter = { userId: new Types.ObjectId(userId) };
    const total = await TopUpModel.countDocuments(filter);
    const docs = await TopUpModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return { total, page, limit, docs };
  },

  async existsByTransactionId(provider: string, transactionId: string) {
    // Check if any TOP_UP has successfully verified this transaction ID
    const count = await TopUpModel.countDocuments({
      paymentProvider: provider,
      customerTransactionId: transactionId.toUpperCase(),
      status: TopUpStatus.VERIFIED,
    });
    return count > 0;
  },

  update(id: string | Types.ObjectId, data: Partial<TopUpDocument>) {
    return TopUpModel.findByIdAndUpdate(id, data, { new: true });
  },
};
