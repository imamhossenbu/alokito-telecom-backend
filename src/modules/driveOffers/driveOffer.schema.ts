import { z } from "../../shared/utils/zod";
import { DriveOfferStatus } from "./driveOffer.model";

export const createDriveOfferBodySchema = z.object({
  operatorId: z.string().min(1, "Operator is required"),
  offerName: z.string().min(1).max(500),
  category: z.string().min(1),
  offerType: z.string().min(1).default("DRIVE"),
  offerValue: z.string().min(1).default("Standard"),
  validity: z.string().min(1),
  purchasePrice: z.number().min(0), // BDT
  sellingPrice: z.number().min(0), // BDT
  regularPrice: z.number().min(0).optional(), // BDT
  activationCode: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default(DriveOfferStatus.ACTIVE),
});
export type CreateDriveOfferBody = z.infer<typeof createDriveOfferBodySchema>;

export const updateDriveOfferBodySchema = z.object({
  operatorId: z.string().min(1).optional(),
  offerName: z.string().min(1).max(500).optional(),
  category: z.string().min(1).optional(),
  offerType: z.string().min(1).optional(),
  offerValue: z.string().min(1).optional(),
  validity: z.string().min(1).optional(),
  purchasePrice: z.number().min(0).optional(), // BDT
  sellingPrice: z.number().min(0).optional(), // BDT
  regularPrice: z.number().min(0).optional(), // BDT
  activationCode: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});
export type UpdateDriveOfferBody = z.infer<typeof updateDriveOfferBodySchema>;

export const listDriveOffersQuerySchema = z.object({
  operatorId: z.string().optional(),
  operator: z.string().optional(),
  category: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type ListDriveOffersQuery = z.infer<typeof listDriveOffersQuerySchema>;
