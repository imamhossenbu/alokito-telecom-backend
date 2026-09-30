import { z } from "../../shared/utils/zod";
import { OfferStatus } from "./offer.model";

export const createOfferBodySchema = z.object({
  operatorId: z.string().min(1, "Operator is required"),
  name: z.string().min(1).max(200),
  category: z.string().min(1),
  type: z.string().min(1).default("REGULAR"),
  offerValue: z.string().min(1).default("Standard"),
  validity: z.string().min(1),
  sellingPrice: z.number().min(0), // BDT
  regularPrice: z.number().min(0).optional(), // BDT
  activationCode: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default(OfferStatus.ACTIVE),
});
export type CreateOfferBody = z.infer<typeof createOfferBodySchema>;

export const updateOfferBodySchema = z.object({
  operatorId: z.string().min(1).optional(),
  name: z.string().min(1).max(200).optional(),
  category: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  offerValue: z.string().min(1).optional(),
  validity: z.string().min(1).optional(),
  sellingPrice: z.number().min(0).optional(), // BDT
  regularPrice: z.number().min(0).optional(), // BDT
  activationCode: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});
export type UpdateOfferBody = z.infer<typeof updateOfferBodySchema>;

export const listOffersQuerySchema = z.object({
  operatorId: z.string().optional(),
  operator: z.string().optional(),
  category: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type ListOffersQuery = z.infer<typeof listOffersQuerySchema>;
