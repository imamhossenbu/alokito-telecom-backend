import { z } from "../../shared/utils/zod";

export const createRefundBodySchema = z.object({
  reason: z.string().min(4).max(500),
});
export type CreateRefundBody = z.infer<typeof createRefundBodySchema>;
