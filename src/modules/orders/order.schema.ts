import { z } from "../../shared/utils/zod";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId");

export const createOrderBodySchema = z.object({
  offerId: objectIdSchema,
  offerType: z.enum(["NORMAL", "DRIVE"]),
  phone: z.string().regex(/^(?:\+?880|0)1[3-9]\d{8}$/, "Enter a valid Bangladeshi phone number"),
});
export type CreateOrderBody = z.infer<typeof createOrderBodySchema>;

export const adminCreateManualOrderBodySchema = z.object({
  userId: objectIdSchema,
  operatorId: objectIdSchema,
  offerId: objectIdSchema,
  offerType: z.enum(["NORMAL", "DRIVE"]),
  phone: z.string().regex(/^(?:\+?880|0)1[3-9]\d{8}$/, "Enter a valid Bangladeshi phone number"),
});
export type AdminCreateManualOrderBody = z.infer<typeof adminCreateManualOrderBodySchema>;
