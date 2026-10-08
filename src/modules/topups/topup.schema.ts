import { z } from "../../shared/utils/zod";

export const createTopUpBodySchema = z.object({
  provider: z.enum(["BKASH", "NAGAD", "ROCKET", "UPAY", "OTHER"]),
  amount: z.number().min(10).max(50000), // BDT, e.g. min 10 Tk, max 50000 Tk
  transactionId: z.string().min(4).max(50).toUpperCase().optional(),
  senderPhone: z.string().max(20).optional(),
});
export type CreateTopUpBody = z.infer<typeof createTopUpBodySchema>;

export const verifyTopUpBodySchema = z.object({
  transactionId: z.string().min(4).max(50).toUpperCase(),
});
export type VerifyTopUpBody = z.infer<typeof verifyTopUpBodySchema>;
