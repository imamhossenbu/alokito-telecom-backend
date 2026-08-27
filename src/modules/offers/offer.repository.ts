import { Types } from "mongoose";
import { OfferModel, OfferDocument, OfferStatus } from "./offer.model";

export const offerRepository = {
  findById(id: string | Types.ObjectId) {
    return OfferModel.findById(id).populate("operatorId");
  },

  async findAllActive(query: { operatorId?: string; category?: string }, page = 1, limit = 20) {
    const filter: Record<string, any> = { status: OfferStatus.ACTIVE };
    if (query.operatorId) filter.operatorId = new Types.ObjectId(query.operatorId);
    if (query.category) filter.category = query.category;

    const total = await OfferModel.countDocuments(filter);
    const docs = await OfferModel.find(filter)
      .populate("operatorId")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return { total, page, limit, docs };
  },

  async findAll(query: { operatorId?: string; category?: string; status?: string }, page = 1, limit = 20) {
    const filter: Record<string, any> = {};
    if (query.operatorId) filter.operatorId = new Types.ObjectId(query.operatorId);
    if (query.category) filter.category = query.category;
    if (query.status) filter.status = query.status;

    const total = await OfferModel.countDocuments(filter);
    const docs = await OfferModel.find(filter)
      .populate("operatorId")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return { total, page, limit, docs };
  },

  create(data: Partial<OfferDocument>) {
    return OfferModel.create(data);
  },

  update(id: string | Types.ObjectId, data: Partial<OfferDocument>) {
    return OfferModel.findByIdAndUpdate(id, data, { new: true });
  },

  delete(id: string | Types.ObjectId) {
    return OfferModel.findByIdAndDelete(id);
  },
};
