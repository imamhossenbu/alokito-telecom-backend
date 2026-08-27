import { Types, ClientSession } from "mongoose";
import { OrderModel, OrderDocument } from "./order.model";
import { generateReferenceId, IdPrefix } from "../../shared/utils/id-generator";

export const orderRepository = {
  findById(id: string | Types.ObjectId) {
    return OrderModel.findById(id).populate("userId").populate("operatorId");
  },

  findByOrderNumber(orderNumber: string) {
    return OrderModel.findOne({ orderNumber }).populate("userId").populate("operatorId");
  },

  findByTransactionId(transactionId: string) {
    return OrderModel.findOne({ transactionId });
  },

  async create(data: Omit<Partial<OrderDocument>, "orderNumber" | "transactionId">, session?: ClientSession) {
    const orderNumber = generateReferenceId(IdPrefix.ORDER);
    // Generate internal transactionId using our nanoid/crypto logic
    const transactionId = "TXN-" + Math.random().toString(36).substring(2, 10).toUpperCase();
    const [doc] = await OrderModel.create([{ ...data, orderNumber, transactionId }], { session });
    return doc;
  },

  async findAll(query: Record<string, any>, page = 1, limit = 20) {
    const total = await OrderModel.countDocuments(query);
    const docs = await OrderModel.find(query)
      .populate("userId")
      .populate("operatorId")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return { total, page, limit, docs };
  },
};
