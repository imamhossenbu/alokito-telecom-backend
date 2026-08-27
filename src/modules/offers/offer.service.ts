import { Types } from "mongoose";
import { offerRepository } from "./offer.repository";
import { operatorRepository } from "../operators/operator.repository";
import { OfferDocument, OfferStatus } from "./offer.model";
import { NotFoundError } from "../../shared/errors/app-error";
import { auditLogService } from "../auditLogs/auditLog.service";
import { ActorType } from "../auditLogs/auditLog.model";
import { bdtToPoisha } from "../../shared/utils/money";

export const offerService = {
  async getActiveOffers(query: { operatorId?: string; category?: string }, page?: number, limit?: number) {
    return offerRepository.findAllActive(query, page, limit);
  },

  async getActiveOfferById(id: string) {
    const offer = await offerRepository.findById(id);
    if (!offer || offer.status !== OfferStatus.ACTIVE) {
      throw new NotFoundError("OFFER_NOT_FOUND", "Offer not found or inactive");
    }
    return offer;
  },

  async adminGetOffers(query: { operatorId?: string; category?: string; status?: string }, page?: number, limit?: number) {
    return offerRepository.findAll(query, page, limit);
  },

  async adminGetOfferById(id: string) {
    const offer = await offerRepository.findById(id);
    if (!offer) {
      throw new NotFoundError("OFFER_NOT_FOUND", "Offer not found");
    }
    return offer;
  },

  async adminCreateOffer(
    data: {
      operatorId: string;
      name: string;
      category: string;
      type: string;
      offerValue: string;
      validity: string;
      sellingPrice: number; // BDT
      activationCode?: string;
      description?: string;
      status: string;
    },
    actor: { id: string; ipAddress?: string; userAgent?: string }
  ) {
    const operator = await operatorRepository.findById(data.operatorId);
    if (!operator) {
      throw new NotFoundError("OFFER_NOT_FOUND", "Operator not found");
    }

    const offer = await offerRepository.create({
      operatorId: new Types.ObjectId(data.operatorId),
      name: data.name,
      category: data.category as any,
      type: data.type,
      offerValue: data.offerValue,
      validity: data.validity,
      sellingPrice: bdtToPoisha(data.sellingPrice),
      activationCode: data.activationCode,
      description: data.description,
      status: data.status as any,
    });

    await auditLogService.log({
      actorType: ActorType.ADMIN,
      actorId: actor.id,
      action: "ADMIN_OFFER_CREATED",
      entityType: "Offer",
      entityId: offer._id,
      metadata: { name: offer.name, sellingPrice: offer.sellingPrice },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return offer;
  },

  async adminUpdateOffer(
    id: string,
    data: {
      operatorId?: string;
      name?: string;
      category?: string;
      type?: string;
      offerValue?: string;
      validity?: string;
      sellingPrice?: number; // BDT
      activationCode?: string;
      description?: string;
      status?: string;
    },
    actor: { id: string; ipAddress?: string; userAgent?: string }
  ) {
    const offer = await offerRepository.findById(id);
    if (!offer) {
      throw new NotFoundError("OFFER_NOT_FOUND", "Offer not found");
    }

    if (data.operatorId) {
      const operator = await operatorRepository.findById(data.operatorId);
      if (!operator) {
        throw new NotFoundError("OFFER_NOT_FOUND", "Operator not found");
      }
    }

    const updateFields: any = {
      ...data,
      operatorId: data.operatorId ? new Types.ObjectId(data.operatorId) : undefined,
      sellingPrice: data.sellingPrice !== undefined ? bdtToPoisha(data.sellingPrice) : undefined,
    };

    // Remove undefined fields
    Object.keys(updateFields).forEach((key) => {
      if (updateFields[key] === undefined) delete updateFields[key];
    });

    const updated = await offerRepository.update(id, updateFields);

    await auditLogService.log({
      actorType: ActorType.ADMIN,
      actorId: actor.id,
      action: "ADMIN_OFFER_UPDATED",
      entityType: "Offer",
      entityId: offer._id,
      metadata: data,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return updated;
  },

  async adminDeleteOffer(
    id: string,
    actor: { id: string; ipAddress?: string; userAgent?: string }
  ) {
    const offer = await offerRepository.findById(id);
    if (!offer) {
      throw new NotFoundError("OFFER_NOT_FOUND", "Offer not found");
    }

    await offerRepository.delete(id);

    await auditLogService.log({
      actorType: ActorType.ADMIN,
      actorId: actor.id,
      action: "ADMIN_OFFER_DELETED",
      entityType: "Offer",
      entityId: offer._id,
      metadata: { name: offer.name },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return { deleted: true };
  },

  async adminSetStatus(
    id: string,
    status: typeof OfferStatus.ACTIVE | typeof OfferStatus.INACTIVE,
    actor: { id: string; ipAddress?: string; userAgent?: string }
  ) {
    const offer = await offerRepository.findById(id);
    if (!offer) {
      throw new NotFoundError("OFFER_NOT_FOUND", "Offer not found");
    }

    offer.status = status;
    await offer.save();

    await auditLogService.log({
      actorType: ActorType.ADMIN,
      actorId: actor.id,
      action: status === OfferStatus.ACTIVE ? "ADMIN_OFFER_ACTIVATED" : "ADMIN_OFFER_DEACTIVATED",
      entityType: "Offer",
      entityId: offer._id,
      metadata: { status },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return offer;
  },
};
