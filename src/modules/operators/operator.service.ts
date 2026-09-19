import { Types } from "mongoose";
import { operatorRepository } from "./operator.repository";
import { OperatorDocument, OperatorStatus } from "./operator.model";
import { ConflictError, NotFoundError } from "../../shared/errors/app-error";
import { auditLogService } from "../auditLogs/auditLog.service";
import { ActorType } from "../auditLogs/auditLog.model";

export const operatorService = {
  async getActiveOperators() {
    return operatorRepository.findAllActive();
  },

  async getActiveOperatorById(id: string) {
    const operator = await operatorRepository.findById(id);
    if (!operator || operator.status !== OperatorStatus.ACTIVE) {
      throw new NotFoundError("OFFER_NOT_FOUND", "Operator not found or inactive");
    }
    return operator;
  },

  async adminGetOperators() {
    return operatorRepository.findAll();
  },

  async adminGetOperatorById(id: string) {
    const operator = await operatorRepository.findById(id);
    if (!operator) {
      throw new NotFoundError("OFFER_NOT_FOUND", "Operator not found");
    }
    return operator;
  },

  async adminCreateOperator(
    data: { name: string; code: string; logoUrl?: string; sortOrder?: number; prefixes?: string[]; ussdBalance?: string; ussdOffer?: string },
    actor: { id: string; ipAddress?: string; userAgent?: string }
  ) {
    const existing = await operatorRepository.findByCode(data.code);
    if (existing) {
      throw new ConflictError("VALIDATION_ERROR", `Operator with code ${data.code.toUpperCase()} already exists`);
    }

    const operator = await operatorRepository.create({
      name: data.name,
      code: data.code.toUpperCase(),
      logoUrl: data.logoUrl,
      prefixes: data.prefixes ?? [],
      ussdBalance: data.ussdBalance,
      ussdOffer: data.ussdOffer,
      sortOrder: data.sortOrder ?? 0,
      status: OperatorStatus.ACTIVE,
    });

    await auditLogService.log({
      actorType: ActorType.ADMIN,
      actorId: actor.id,
      action: "ADMIN_OPERATOR_CREATED",
      entityType: "Operator",
      entityId: operator._id,
      metadata: { name: operator.name, code: operator.code },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return operator;
  },

  async adminUpdateOperator(
    id: string,
    data: { name?: string; code?: string; logoUrl?: string; sortOrder?: number; prefixes?: string[]; ussdBalance?: string; ussdOffer?: string },
    actor: { id: string; ipAddress?: string; userAgent?: string }
  ) {
    const operator = await operatorRepository.findById(id);
    if (!operator) {
      throw new NotFoundError("OFFER_NOT_FOUND", "Operator not found");
    }

    if (data.code && data.code.toUpperCase() !== operator.code) {
      const existing = await operatorRepository.findByCode(data.code);
      if (existing) {
        throw new ConflictError("VALIDATION_ERROR", `Operator with code ${data.code.toUpperCase()} already exists`);
      }
    }

    const updated = await operatorRepository.update(id, {
      ...data,
      code: data.code ? data.code.toUpperCase() : undefined,
    });

    await auditLogService.log({
      actorType: ActorType.ADMIN,
      actorId: actor.id,
      action: "ADMIN_OPERATOR_UPDATED",
      entityType: "Operator",
      entityId: operator._id,
      metadata: data,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return updated;
  },

  async adminSetStatus(
    id: string,
    status: typeof OperatorStatus.ACTIVE | typeof OperatorStatus.INACTIVE,
    actor: { id: string; ipAddress?: string; userAgent?: string }
  ) {
    const operator = await operatorRepository.findById(id);
    if (!operator) {
      throw new NotFoundError("OFFER_NOT_FOUND", "Operator not found");
    }

    operator.status = status;
    await operator.save();

    await auditLogService.log({
      actorType: ActorType.ADMIN,
      actorId: actor.id,
      action: status === OperatorStatus.ACTIVE ? "ADMIN_OPERATOR_ACTIVATED" : "ADMIN_OPERATOR_DEACTIVATED",
      entityType: "Operator",
      entityId: operator._id,
      metadata: { status },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return operator;
  },

  async adminDeleteOperator(id: string, actor: { id: string; ipAddress?: string; userAgent?: string }) {
    const operator = await operatorRepository.findById(id);
    if (!operator) {
      throw new NotFoundError("OFFER_NOT_FOUND", "Operator not found");
    }

    await operatorRepository.delete(operator._id);

    await auditLogService.log({
      actorType: ActorType.ADMIN,
      actorId: actor.id,
      action: "ADMIN_OPERATOR_DELETED",
      entityType: "Operator",
      entityId: operator._id,
      metadata: { name: operator.name, code: operator.code },
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    });

    return { success: true };
  },
};
