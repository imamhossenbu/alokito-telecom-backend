import { Types } from "mongoose";
import { DriveOfferModel, DriveOfferDocument, DriveOfferStatus } from "./driveOffer.model";
import { operatorRepository } from "../operators/operator.repository";

async function resolveOperatorObjectId(operatorInput?: string): Promise<Types.ObjectId | null> {
  if (!operatorInput || operatorInput === "ALL") return null;
  if (Types.ObjectId.isValid(operatorInput)) {
    return new Types.ObjectId(operatorInput);
  }
  const op = await operatorRepository.findByCode(operatorInput.toUpperCase());
  if (op) return op._id;
  return null;
}

export const driveOfferRepository = {
  findById(id: string | Types.ObjectId) {
    return DriveOfferModel.findById(id).populate("operatorId");
  },

  async findAllActive(query: { operatorId?: string; operator?: string; category?: string }, page = 1, limit = 50) {
    const filter: Record<string, any> = { status: DriveOfferStatus.ACTIVE };
    const opParam = query.operatorId || query.operator;
    if (opParam && opParam !== "ALL") {
      const resolvedId = await resolveOperatorObjectId(opParam);
      if (resolvedId) {
        filter.operatorId = resolvedId;
      } else {
        return { total: 0, page, limit, docs: [] };
      }
    }
    if (query.category && query.category !== "ALL") {
      filter.category = new RegExp(`^${query.category}$`, "i");
    }

    const total = await DriveOfferModel.countDocuments(filter);
    const docs = await DriveOfferModel.find(filter)
      .populate("operatorId")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return { total, page, limit, docs };
  },

  async findAll(query: { operatorId?: string; operator?: string; category?: string; status?: string }, page = 1, limit = 50) {
    const filter: Record<string, any> = {};
    const opParam = query.operatorId || query.operator;
    if (opParam && opParam !== "ALL") {
      const resolvedId = await resolveOperatorObjectId(opParam);
      if (resolvedId) {
        filter.operatorId = resolvedId;
      } else {
        return { total: 0, page, limit, docs: [] };
      }
    }
    if (query.category && query.category !== "ALL") {
      filter.category = new RegExp(`^${query.category}$`, "i");
    }
    if (query.status && query.status !== "ALL") {
      filter.status = query.status;
    }

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
