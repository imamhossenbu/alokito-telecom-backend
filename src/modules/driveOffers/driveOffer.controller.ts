import { Request, Response } from "express";
import { driveOfferService } from "./driveOffer.service";
import { sendSuccess, sendCreated } from "../../shared/utils/api-response";
import { createDriveOfferBodySchema, updateDriveOfferBodySchema, listDriveOffersQuerySchema } from "./driveOffer.schema";
import { DriveOfferStatus } from "./driveOffer.model";
import { UnauthorizedError } from "../../shared/errors/app-error";

function getActorContext(req: Request) {
  const actor = req.actor;
  if (!actor) {
    throw new UnauthorizedError();
  }
  let id = "";
  if (actor.type === "ADMIN") {
    id = actor.adminId;
  } else if (actor.type === "CUSTOMER") {
    id = actor.userId;
  } else if (actor.type === "PAYMENT_DEVICE") {
    id = actor.paymentDeviceId;
  }
  return {
    id,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  };
}

function serializeDriveOfferForCustomer(offer: any) {
  const doc = offer.toObject ? offer.toObject() : offer;
  return {
    id: doc._id ? doc._id.toString() : doc.id,
    operator: doc.operatorId ? {
      id: doc.operatorId._id ? doc.operatorId._id.toString() : doc.operatorId.id,
      name: doc.operatorId.name,
      code: doc.operatorId.code,
      logoUrl: doc.operatorId.logoUrl,
    } : undefined,
    offerName: doc.offerName,
    category: doc.category,
    offerType: doc.offerType,
    offerValue: doc.offerValue,
    validity: doc.validity,
    sellingPrice: doc.sellingPrice,
    regularPrice: doc.regularPrice,
    activationCode: doc.activationCode,
    description: doc.description,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function serializeDriveOfferForAdmin(offer: any) {
  const doc = offer.toObject ? offer.toObject() : offer;
  return {
    id: doc._id ? doc._id.toString() : doc.id,
    operator: doc.operatorId ? {
      id: doc.operatorId._id ? doc.operatorId._id.toString() : doc.operatorId.id,
      name: doc.operatorId.name,
      code: doc.operatorId.code,
      logoUrl: doc.operatorId.logoUrl,
    } : undefined,
    offerName: doc.offerName,
    category: doc.category,
    offerType: doc.offerType,
    offerValue: doc.offerValue,
    validity: doc.validity,
    purchasePrice: doc.purchasePrice,
    sellingPrice: doc.sellingPrice,
    regularPrice: doc.regularPrice,
    activationCode: doc.activationCode,
    description: doc.description,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export const driveOfferController = {
  async getActiveOffers(req: Request, res: Response) {
    const query = listDriveOffersQuerySchema.parse(req.query);
    const result = await driveOfferService.getActiveOffers(query, query.page, query.limit);
    sendSuccess(res, {
      data: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        docs: result.docs.map(serializeDriveOfferForCustomer),
      },
    });
  },

  async getActiveOfferById(req: Request, res: Response) {
    const offer = await driveOfferService.getActiveOfferById(req.params.id);
    sendSuccess(res, { data: serializeDriveOfferForCustomer(offer) });
  },

  async adminGetOffers(req: Request, res: Response) {
    const query = req.query;
    const page = query.page ? parseInt(query.page as string, 10) : 1;
    const limit = query.limit ? parseInt(query.limit as string, 10) : 20;
    const result = await driveOfferService.adminGetOffers(
      {
        operatorId: query.operatorId as string,
        category: query.category as string,
        status: query.status as string,
      },
      page,
      limit
    );
    sendSuccess(res, {
      data: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        docs: result.docs.map(serializeDriveOfferForAdmin),
      },
    });
  },

  async adminGetOfferById(req: Request, res: Response) {
    const offer = await driveOfferService.adminGetOfferById(req.params.id);
    sendSuccess(res, { data: serializeDriveOfferForAdmin(offer) });
  },

  async adminCreateOffer(req: Request, res: Response) {
    const body = createDriveOfferBodySchema.parse(req.body);
    const actor = getActorContext(req);
    const offer = await driveOfferService.adminCreateOffer(body, actor);
    sendCreated(res, { data: serializeDriveOfferForAdmin(offer) });
  },

  async adminUpdateOffer(req: Request, res: Response) {
    const body = updateDriveOfferBodySchema.parse(req.body);
    const actor = getActorContext(req);
    const offer = await driveOfferService.adminUpdateOffer(req.params.id, body, actor);
    sendSuccess(res, { data: serializeDriveOfferForAdmin(offer) });
  },

  async adminDeleteOffer(req: Request, res: Response) {
    const actor = getActorContext(req);
    const result = await driveOfferService.adminDeleteOffer(req.params.id, actor);
    sendSuccess(res, { data: result });
  },

  async adminActivateOffer(req: Request, res: Response) {
    const actor = getActorContext(req);
    const offer = await driveOfferService.adminSetStatus(req.params.id, DriveOfferStatus.ACTIVE, actor);
    sendSuccess(res, { data: serializeDriveOfferForAdmin(offer) });
  },

  async adminDeactivateOffer(req: Request, res: Response) {
    const actor = getActorContext(req);
    const offer = await driveOfferService.adminSetStatus(req.params.id, DriveOfferStatus.INACTIVE, actor);
    sendSuccess(res, { data: serializeDriveOfferForAdmin(offer) });
  },
};
