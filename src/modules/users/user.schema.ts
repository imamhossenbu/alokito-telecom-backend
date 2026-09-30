import { z } from "../../shared/utils/zod";
import { paginationQuerySchema } from "../../shared/pagination/paginate";

// ── PATCH /users/me ────────────────────────────────────
export const updateProfileBodySchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z
    .string()
    .regex(
      /^(?:\+?880|0)1[3-9]\d{8}$/,
      "Enter a valid Bangladeshi phone number",
    )
    .optional(),
  district: z.string().max(100).optional(),
  address: z.string().max(300).optional(),
});
export type UpdateProfileBody = z.infer<typeof updateProfileBodySchema>;

// ── POST /users/customers (customer-created-customer) ──
export const createCustomerBodySchema = z.object({
  name: z.string().min(2).max(100).openapi({ example: "Rahim Uddin" }),
  email: z.string().email(),
  phone: z
    .string()
    .regex(
      /^(?:\+?880|0)1[3-9]\d{8}$/,
      "Enter a valid Bangladeshi phone number",
    ),
  nidNumber: z.string().min(10).max(17).optional(),
  dateOfBirth: z
    .string()
    .datetime()
    .optional()
    .openapi({ example: "1998-05-14T00:00:00.000Z" }),
  address: z.string().max(300).optional(),
});
export type CreateCustomerBody = z.infer<typeof createCustomerBodySchema>;

// ── DELETE /users/me/trusted-devices/:deviceId ─────────
export const deviceIdParamsSchema = z.object({
  deviceId: z.string().min(1),
});

// ── Admin: GET /admin/users ─────────────────────────────
export const listUsersQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  status: z
    .enum(["PENDING", "ACTIVE", "BLOCKED", "SUSPENDED", "DELETED"])
    .optional(),
  district: z.string().optional(),
  sort: z.enum(["createdAt", "name"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

// ── Admin: POST /admin/users ────────────────────────────
export const adminCreateCustomerBodySchema = createCustomerBodySchema;
export type AdminCreateCustomerBody = z.infer<
  typeof adminCreateCustomerBodySchema
>;

// ── Admin: PATCH /admin/users/:id ───────────────────────
export const adminUpdateCustomerBodySchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z
    .string()
    .regex(
      /^(?:\+?880|0)1[3-9]\d{8}$/,
      "Enter a valid Bangladeshi phone number",
    )
    .optional(),
  email: z.string().email().optional(),
  status: z
    .enum(["PENDING", "ACTIVE", "BLOCKED", "SUSPENDED", "DELETED"])
    .optional(),
  district: z.string().max(100).optional(),
  address: z.string().max(300).optional(),
});
export type AdminUpdateCustomerBody = z.infer<
  typeof adminUpdateCustomerBodySchema
>;

export const idParamsSchema = z.object({
  id: z.string().min(1),
});
