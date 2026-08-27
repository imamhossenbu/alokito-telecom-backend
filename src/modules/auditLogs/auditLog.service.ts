import { Types } from "mongoose";
import { AuditLogModel, ActorTypeType } from "./auditLog.model";
import { logger } from "../../config/logger";

interface LogParams {
  actorType: ActorTypeType;
  actorId?: Types.ObjectId | string;
  actorRole?: string;
  action: string;
  entityType: string;
  entityId?: Types.ObjectId | string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export const auditLogService = {
  async log(params: LogParams): Promise<void> {
    try {
      await AuditLogModel.create(params);
    } catch (err) {
      // Never fail the main operational flow if writing an audit log fails.
      logger.error({ err, params }, "Failed to write audit log to database");
    }
  },
};
