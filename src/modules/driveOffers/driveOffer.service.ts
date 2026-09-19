import { Types } from "mongoose";
import { driveOfferRepository } from "./driveOffer.repository";
import { operatorRepository } from "../operators/operator.repository";
import { DriveOfferDocument, DriveOfferStatus } from "./driveOffer.model";
import { NotFoundError } from "../../shared/errors/app-error";
import { auditLogService } from "../auditLogs/auditLog.service";
import { ActorType } from "../auditLogs/auditLog.model";
import { bdtToPoisha } from "../../shared/utils/money";

export const driveOfferService = {
  async getActiveOffers(query: { operatorId?: string; category?: string }, page?: number, limit?: number) {
    return driveOfferRepository.findAllActive(query, page, limit);
  },

  async getActiveOfferById(id: string) {
    const offer = await driveOfferRepository.findById(id);
    if (!offer || offer.status !== DriveOfferStatus.ACTIVE) {
      throw new NotFoundError("OFFER_NOT_FOUND", "Drive offer not found or inactive");
    }
    return offer;
  },

  async adminGetOffers(query: { operatorId?: string; category?: string; status?: string }, page?: number, limit?: number) {
    return driveOfferRepository.findAll(query, page, limit);
  },

  async adminGetOfferById(id: string) {
    const offer = await driveOfferRepository.findById(id);
    if (!offer) {
      throw new NotFoundError("OFFER_NOT_FOUND", "Drive offer not found");
    }
    return offer;
  },

  async adminCreateOffer(
    data: {
      operatorId: string;
      offerName: string;
      category: string;
      offerType: string;
      offerValue: string;
      validity: string;
      purchasePrice: number; // BDT
      sellingPrice: number; // BDT
      activationCode?: string;
      description?: string;
      status: string;
    },
    actor: { id: string; ipAddress?: string; userAgent?: string }
  ) {
    let operator = Types.ObjectId.isValid(data.operatorId)
      ? await operatorRepository.findById(data.operatorId)
      : await operatorRepository.findByCode(data.operatorId);
    if (!operator) {
      operator = await operatorRepository.findByCode(data.operatorId);
    }
    if (!operator) {
      throw new NotFoundError("OFFER_NOT_FOUND", "Operator not found");
    }

    const offer = await driveOfferRepository.create({
      operatorId: operator._id,
      offerName: data.offerName,
      category: data.category as any,
      offerType: data.offerType,
      offerValue: data.offerValue,
      validity: data.validity,
      purchasePrice: bdtToPoisha(data.purchasePrice),
      sellingPrice: bdtToPoisha(data.sellingPrice),
      activationCode: data.activationCode,
      description: data.description,
      status: data.status as any,
    });

    await auditLogService.log({
      actorType: ActorType.ADMIN,
      actorId: actor.id,
      action: "ADMIN_DRIVEOFFER_CREATED",
      entityType: "DriveOffer",
      entityId: offer._id,
      metadata: { name: offer.offerName, purchasePrice: offer.purchasePrice, sellingPrice: offer.sellingPrice },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return offer;
  },

  async adminUpdateOffer(
    id: string,
    data: {
      operatorId?: string;
      offerName?: string;
      category?: string;
      offerType?: string;
      offerValue?: string;
      validity?: string;
      purchasePrice?: number; // BDT
      sellingPrice?: number; // BDT
      activationCode?: string;
      description?: string;
      status?: string;
    },
    actor: { id: string; ipAddress?: string; userAgent?: string }
  ) {
    const offer = await driveOfferRepository.findById(id);
    if (!offer) {
      throw new NotFoundError("OFFER_NOT_FOUND", "Drive offer not found");
    }

    let resolvedOperatorId: Types.ObjectId | undefined;
    if (data.operatorId) {
      const operator = Types.ObjectId.isValid(data.operatorId)
        ? await operatorRepository.findById(data.operatorId)
        : await operatorRepository.findByCode(data.operatorId);
      if (!operator) {
        throw new NotFoundError("OFFER_NOT_FOUND", "Operator not found");
      }
      resolvedOperatorId = operator._id;
    }

    const updateFields: any = {
      ...data,
      operatorId: resolvedOperatorId,
      purchasePrice: data.purchasePrice !== undefined ? bdtToPoisha(data.purchasePrice) : undefined,
      sellingPrice: data.sellingPrice !== undefined ? bdtToPoisha(data.sellingPrice) : undefined,
    };

    // Remove undefined fields
    Object.keys(updateFields).forEach((key) => {
      if (updateFields[key] === undefined) delete updateFields[key];
    });

    const updated = await driveOfferRepository.update(id, updateFields);

    await auditLogService.log({
      actorType: ActorType.ADMIN,
      actorId: actor.id,
      action: "ADMIN_DRIVEOFFER_UPDATED",
      entityType: "DriveOffer",
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
    const offer = await driveOfferRepository.findById(id);
    if (!offer) {
      throw new NotFoundError("OFFER_NOT_FOUND", "Drive offer not found");
    }

    await driveOfferRepository.delete(id);

    await auditLogService.log({
      actorType: ActorType.ADMIN,
      actorId: actor.id,
      action: "ADMIN_DRIVEOFFER_DELETED",
      entityType: "DriveOffer",
      entityId: offer._id,
      metadata: { name: offer.offerName },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return { deleted: true };
  },

  async adminSetStatus(
    id: string,
    status: typeof DriveOfferStatus.ACTIVE | typeof DriveOfferStatus.INACTIVE,
    actor: { id: string; ipAddress?: string; userAgent?: string }
  ) {
    const offer = await driveOfferRepository.findById(id);
    if (!offer) {
      throw new NotFoundError("OFFER_NOT_FOUND", "Drive offer not found");
    }

    offer.status = status;
    await offer.save();

    await auditLogService.log({
      actorType: ActorType.ADMIN,
      actorId: actor.id,
      action: status === DriveOfferStatus.ACTIVE ? "ADMIN_DRIVEOFFER_ACTIVATED" : "ADMIN_DRIVEOFFER_DEACTIVATED",
      entityType: "DriveOffer",
      entityId: offer._id,
      metadata: { status },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return offer;
  },
};
