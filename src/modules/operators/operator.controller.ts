import { Request, Response } from "express";
import { operatorService } from "./operator.service";
import { sendSuccess, sendCreated } from "../../shared/utils/api-response";
import { createOperatorBodySchema, updateOperatorBodySchema } from "./operator.schema";
import { OperatorStatus } from "./operator.model";
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

export const operatorController = {
  async getActiveOperators(req: Request, res: Response) {
    const list = await operatorService.getActiveOperators();
    sendSuccess(res, { data: list });
  },

  async getActiveOperatorById(req: Request, res: Response) {
    const operator = await operatorService.getActiveOperatorById(req.params.id);
    sendSuccess(res, { data: operator });
  },

  async adminGetOperators(req: Request, res: Response) {
    const list = await operatorService.adminGetOperators();
    sendSuccess(res, { data: list });
  },

  async adminGetOperatorById(req: Request, res: Response) {
    const operator = await operatorService.adminGetOperatorById(req.params.id);
    sendSuccess(res, { data: operator });
  },

  async adminCreateOperator(req: Request, res: Response) {
    const body = createOperatorBodySchema.parse(req.body);
    const actor = getActorContext(req);
    const operator = await operatorService.adminCreateOperator(body, actor);
    sendCreated(res, { data: operator });
  },

  async adminUpdateOperator(req: Request, res: Response) {
    const body = updateOperatorBodySchema.parse(req.body);
    const actor = getActorContext(req);
    const operator = await operatorService.adminUpdateOperator(req.params.id, body, actor);
    sendSuccess(res, { data: operator });
  },

  async adminActivateOperator(req: Request, res: Response) {
    const actor = getActorContext(req);
    const operator = await operatorService.adminSetStatus(req.params.id, OperatorStatus.ACTIVE, actor);
    sendSuccess(res, { data: operator });
  },

  async adminDeactivateOperator(req: Request, res: Response) {
    const actor = getActorContext(req);
    const operator = await operatorService.adminSetStatus(req.params.id, OperatorStatus.INACTIVE, actor);
    sendSuccess(res, { data: operator });
  },
};
