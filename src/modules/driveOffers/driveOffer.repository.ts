import { Types } from "mongoose";
import { DriveOfferModel, DriveOfferDocument, DriveOfferStatus } from "./driveOffer.model";

export const driveOfferRepository = {
  findById(id: string | Types.ObjectId) {
    return DriveOfferModel.findById(id).populate("operatorId");
  },

  async findAllActive(query: { operatorId?: string; category?: string }, page = 1, limit = 20) {
    const filter: Record<string, any> = { status: DriveOfferStatus.ACTIVE };
    if (query.operatorId) filter.operatorId = new Types.ObjectId(query.operatorId);
    if (query.category) filter.category = query.category;

    const total = await DriveOfferModel.countDocuments(filter);
    const docs = await DriveOfferModel.find(filter)
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

    const total = await DriveOfferModel.countDocuments(filter);
    const docs = await DriveOfferModel.find(filter)
      .populate("operatorId")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return { total, page, limit, docs };
  },

  create(data: Partial<DriveOfferDocument>) {
    return DriveOfferModel.create(data);
  },

  update(id: string | Types.ObjectId, data: Partial<DriveOfferDocument>) {
    return DriveOfferModel.findByIdAndUpdate(id, data, { new: true });
  },

  delete(id: string | Types.ObjectId) {
    return DriveOfferModel.findByIdAndDelete(id);
  },
};
