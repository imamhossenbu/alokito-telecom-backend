import { z } from "../../shared/utils/zod";

// PIN: numeric, 4-6 digits (spec section 59). Never logged (see logger.ts redact list).
const pinSchema = z
  .string()
  .regex(/^\d{4,6}$/, "PIN must be 4 to 6 digits")
  .openapi({ example: "1234" });

const otpCodeSchema = z
  .string()
  .regex(/^\d{6}$/, "Code must be 6 digits")
  .openapi({ example: "482913" });

const emailSchema = z
  .string()
  .email()
  .openapi({ example: "customer@example.com" });

const bdPhoneSchema = z
  .string()
  .regex(/^(?:\+?880|0)1[3-9]\d{8}$/, "Enter a valid Bangladeshi phone number")
  .openapi({ example: "01712345678" });

const deviceInfoSchema = z.object({
  deviceId: z.string().min(1).openapi({ example: "device-uuid-abc123" }),
  deviceName: z.string().optional().openapi({ example: "Imam\u2019s Pixel 8" }),
  platform: z.enum(["ANDROID", "WEB", "IOS", "OTHER"]).default("OTHER"),
  appVersion: z.string().optional().openapi({ example: "1.0.0" }),
});

// ── POST /auth/register ──────────────────────────────────
export const registerBodySchema = z.object({
  name: z.string().min(2).max(100).openapi({ example: "Imam Hossen" }),
  email: emailSchema,
  phone: bdPhoneSchema,
  pin: pinSchema,
  nidNumber: z.string().optional(),
  nameBn: z.string().optional(),
  fatherName: z.string().optional(),
  motherName: z.string().optional(),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
  gender: z.string().optional(),
});
export type RegisterBody = z.infer<typeof registerBodySchema>;

// ── POST /auth/register/verify ───────────────────────────
export const registerVerifyBodySchema = z.object({
  registrationId: z.string().min(1),
  code: otpCodeSchema,
});
export type RegisterVerifyBody = z.infer<typeof registerVerifyBodySchema>;

// ── POST /auth/register/resend ───────────────────────────
export const registerResendBodySchema = z.object({
  registrationId: z.string().min(1),
});
export type RegisterResendBody = z.infer<typeof registerResendBodySchema>;

// ── POST /auth/login ──────────────────────────────────────
export const loginBodySchema = z.object({
  email: z.string().min(1, "Email or phone is required"),
  pin: z.string().min(4, "PIN or password must be at least 4 characters"),
  ...deviceInfoSchema.shape,
});
export type LoginBody = z.infer<typeof loginBodySchema>;

// ── POST /auth/login/verify-device ───────────────────────
export const loginVerifyDeviceBodySchema = z.object({
  verificationId: z.string().min(1),
  code: otpCodeSchema,
  deviceId: z.string().min(1),
  trustDevice: z.boolean().default(false),
});
export type LoginVerifyDeviceBody = z.infer<typeof loginVerifyDeviceBodySchema>;

// ── POST /auth/refresh ────────────────────────────────────
export const refreshBodySchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshBody = z.infer<typeof refreshBodySchema>;

// ── POST /auth/logout ─────────────────────────────────────
export const logoutBodySchema = z.object({
  refreshToken: z.string().min(1),
});
export type LogoutBody = z.infer<typeof logoutBodySchema>;

// ── POST /auth/forgot-pin ─────────────────────────────────
export const forgotPinBodySchema = z.object({
  email: emailSchema,
});
export type ForgotPinBody = z.infer<typeof forgotPinBodySchema>;

// ── POST /auth/forgot-pin/verify ─────────────────────────
export const forgotPinVerifyBodySchema = z.object({
  verificationId: z.string().min(1),
  code: otpCodeSchema,
});
export type ForgotPinVerifyBody = z.infer<typeof forgotPinVerifyBodySchema>;

// ── POST /auth/reset-pin ──────────────────────────────────
export const resetPinBodySchema = z
  .object({
    resetToken: z.string().min(1),
    newPin: pinSchema,
    confirmPin: pinSchema,
  })
  .refine((data) => data.newPin === data.confirmPin, {
    message: "newPin and confirmPin must match",
    path: ["confirmPin"],
  });
export type ResetPinBody = z.infer<typeof resetPinBodySchema>;

// ── POST /users/me/change-pin ─────────────────────────────
export const changePinBodySchema = z
  .object({
    currentPin: pinSchema,
    newPin: pinSchema,
    confirmPin: pinSchema,
  })
  .refine((data) => data.newPin === data.confirmPin, {
    message: "newPin and confirmPin must match",
    path: ["confirmPin"],
  });
export type ChangePinBody = z.infer<typeof changePinBodySchema>;

// ── POST /admin/auth/login ────────────────────────────────
export const adminLoginBodySchema = z.object({
  email: emailSchema,
  password: z.string().min(8).openapi({ example: "a-strong-password" }),
});
export type AdminLoginBody = z.infer<typeof adminLoginBodySchema>;
