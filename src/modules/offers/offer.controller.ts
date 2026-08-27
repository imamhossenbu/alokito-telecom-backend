import { Request, Response } from "express";
import { offerService } from "./offer.service";
import { sendSuccess, sendCreated } from "../../shared/utils/api-response";
import { createOfferBodySchema, updateOfferBodySchema, listOffersQuerySchema } from "./offer.schema";
import { OfferStatus } from "./offer.model";
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

export const offerController = {
  async getActiveOffers(req: Request, res: Response) {
    const query = listOffersQuerySchema.parse(req.query);
    const result = await offerService.getActiveOffers(query, query.page, query.limit);
    sendSuccess(res, { data: result });
  },

  async getActiveOfferById(req: Request, res: Response) {
    const offer = await offerService.getActiveOfferById(req.params.id);
    sendSuccess(res, { data: offer });
  },

  async adminGetOffers(req: Request, res: Response) {
    const query = req.query; // Let service handle parsing if needed or pass directly
    const page = query.page ? parseInt(query.page as string, 10) : 1;
    const limit = query.limit ? parseInt(query.limit as string, 10) : 20;
    const result = await offerService.adminGetOffers(
      {
        operatorId: query.operatorId as string,
        category: query.category as string,
        status: query.status as string,
      },
      page,
      limit
    );
    sendSuccess(res, { data: result });
  },

  async adminGetOfferById(req: Request, res: Response) {
    const offer = await offerService.adminGetOfferById(req.params.id);
    sendSuccess(res, { data: offer });
  },

  async adminCreateOffer(req: Request, res: Response) {
    const body = createOfferBodySchema.parse(req.body);
    const actor = getActorContext(req);
    const offer = await offerService.adminCreateOffer(body, actor);
    sendCreated(res, { data: offer });
  },

  async adminUpdateOffer(req: Request, res: Response) {
    const body = updateOfferBodySchema.parse(req.body);
    const actor = getActorContext(req);
    const offer = await offerService.adminUpdateOffer(req.params.id, body, actor);
    sendSuccess(res, { data: offer });
  },

  async adminDeleteOffer(req: Request, res: Response) {
    const actor = getActorContext(req);
    const result = await offerService.adminDeleteOffer(req.params.id, actor);
    sendSuccess(res, { data: result });
  },

  async adminActivateOffer(req: Request, res: Response) {
    const actor = getActorContext(req);
    const offer = await offerService.adminSetStatus(req.params.id, OfferStatus.ACTIVE, actor);
    sendSuccess(res, { data: offer });
  },

  async adminDeactivateOffer(req: Request, res: Response) {
    const actor = getActorContext(req);
    const offer = await offerService.adminSetStatus(req.params.id, OfferStatus.INACTIVE, actor);
    sendSuccess(res, { data: offer });
  },
};
