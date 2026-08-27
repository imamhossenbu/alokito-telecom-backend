import { Schema, model, Document, Types } from "mongoose";

export const ActorType = {
  ADMIN: "ADMIN",
  CUSTOMER: "CUSTOMER",
  SYSTEM: "SYSTEM",
  DEVICE: "DEVICE",
} as const;
export type ActorTypeType = (typeof ActorType)[keyof typeof ActorType];

export interface AuditLogDocument extends Document {
  _id: Types.ObjectId;
  actorType: ActorTypeType;
  actorId?: Types.ObjectId | string;
  actorRole?: string;
  action: string;
  entityType: string;
  entityId?: Types.ObjectId | string;
  metadata: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<AuditLogDocument>(
  {
    actorType: { type: String, enum: Object.values(ActorType), required: true },
    actorId: { type: Schema.Types.Mixed },
    actorRole: { type: String },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: Schema.Types.Mixed },
    metadata: { type: Schema.Types.Mixed, default: {} },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actorType: 1, actorId: 1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });

export const AuditLogModel = model<AuditLogDocument>("AuditLog", auditLogSchema);
