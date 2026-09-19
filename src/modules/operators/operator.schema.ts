import { z } from "../../shared/utils/zod";
import { OperatorStatus } from "./operator.model";

export const createOperatorBodySchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(10).toUpperCase(),
  logoUrl: z.string().url().optional(),
  prefixes: z.array(z.string()).optional(),
  ussdBalance: z.string().optional(),
  ussdOffer: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default(OperatorStatus.ACTIVE),
  sortOrder: z.number().default(0),
});
export type CreateOperatorBody = z.infer<typeof createOperatorBodySchema>;

export const updateOperatorBodySchema = z.object({
  name: z.string().min(2).max(100).optional(),
  code: z.string().min(2).max(10).toUpperCase().optional(),
  logoUrl: z.string().url().optional(),
  prefixes: z.array(z.string()).optional(),
  ussdBalance: z.string().optional(),
  ussdOffer: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  sortOrder: z.number().optional(),
});
export type UpdateOperatorBody = z.infer<typeof updateOperatorBodySchema>;
