import { z } from "../../shared/utils/zod";

export const createTopUpBodySchema = z.object({
  provider: z.enum(["BKASH", "NAGAD", "ROCKET", "OTHER"]),
  amount: z.number().min(10).max(50000), // BDT, e.g. min 10 Tk, max 50000 Tk
});
export type CreateTopUpBody = z.infer<typeof createTopUpBodySchema>;

export const verifyTopUpBodySchema = z.object({
  transactionId: z.string().min(4).max(50).toUpperCase(),
});
export type VerifyTopUpBody = z.infer<typeof verifyTopUpBodySchema>;
