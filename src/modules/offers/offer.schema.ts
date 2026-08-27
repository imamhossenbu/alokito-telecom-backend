import { z } from "../../shared/utils/zod";
import { OfferStatus } from "./offer.model";

export const createOfferBodySchema = z.object({
  operatorId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid operatorId"),
  name: z.string().min(2).max(200),
  category: z.enum(["INTERNET", "MINUTES", "BUNDLE", "SMS", "CALL_RATE", "OTHER"]),
  type: z.string().min(1),
  offerValue: z.string().min(1),
  validity: z.string().min(1),
  sellingPrice: z.number().min(0), // BDT
  activationCode: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default(OfferStatus.ACTIVE),
});
export type CreateOfferBody = z.infer<typeof createOfferBodySchema>;

export const updateOfferBodySchema = z.object({
  operatorId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid operatorId").optional(),
  name: z.string().min(2).max(200).optional(),
  category: z.enum(["INTERNET", "MINUTES", "BUNDLE", "SMS", "CALL_RATE", "OTHER"]).optional(),
  type: z.string().min(1).optional(),
  offerValue: z.string().min(1).optional(),
  validity: z.string().min(1).optional(),
  sellingPrice: z.number().min(0).optional(), // BDT
  activationCode: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});
export type UpdateOfferBody = z.infer<typeof updateOfferBodySchema>;

export const listOffersQuerySchema = z.object({
  operatorId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid operatorId").optional(),
  category: z.enum(["INTERNET", "MINUTES", "BUNDLE", "SMS", "CALL_RATE", "OTHER"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListOffersQuery = z.infer<typeof listOffersQuerySchema>;
