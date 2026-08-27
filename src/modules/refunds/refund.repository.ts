import { Types, ClientSession } from "mongoose";
import { RefundModel, RefundDocument } from "./refund.model";
import { generateReferenceId, IdPrefix } from "../../shared/utils/id-generator";

export const refundRepository = {
  findById(id: string | Types.ObjectId) {
    return RefundModel.findById(id).populate("userId").populate("orderId");
  },

  findByOrderId(orderId: string | Types.ObjectId) {
    return RefundModel.findOne({ orderId }).populate("userId").populate("orderId");
  },

  async create(data: Omit<Partial<RefundDocument>, "refundNumber">, session?: ClientSession) {
    const refundNumber = generateReferenceId(IdPrefix.REFUND);
    const [doc] = await RefundModel.create([{ ...data, refundNumber }], { session });
    return doc;
  },

  async findAll(query: Record<string, any>, page = 1, limit = 20) {
    const total = await RefundModel.countDocuments(query);
    const docs = await RefundModel.find(query)
      .populate("userId")
      .populate("orderId")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return { total, page, limit, docs };
  },
};
