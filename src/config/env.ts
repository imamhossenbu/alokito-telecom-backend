import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().default(4000),

  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),

  JWT_ACCESS_SECRET: z
    .string()
    .min(16, "JWT_ACCESS_SECRET must be at least 16 chars"),
  JWT_ACCESS_EXPIRES: z.string().default("15m"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(16, "JWT_REFRESH_SECRET must be at least 16 chars"),
  JWT_REFRESH_EXPIRES: z.string().default("30d"),

  REDIS_URL: z.string().optional(),

  // Nodemailer over SMTP — works with any provider (Gmail App Password,
  // Brevo/Sendinblue free tier, Mailtrap for dev testing, etc).
  SMTP_HOST: z.string().min(1, "SMTP_HOST is required"),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USER: z.string().min(1, "SMTP_USER is required"),
  SMTP_PASS: z.string().min(1, "SMTP_PASS is required"),
  EMAIL_FROM: z.string().default("Drive Offer <no-reply@driveoffer.app>"),

  STORAGE_PROVIDER: z.literal("cloudinary").default("cloudinary"),
  CLOUDINARY_CLOUD_NAME: z.string().min(1, "CLOUDINARY_CLOUD_NAME is required"),
  CLOUDINARY_API_KEY: z.string().min(1, "CLOUDINARY_API_KEY is required"),
  CLOUDINARY_API_SECRET: z.string().min(1, "CLOUDINARY_API_SECRET is required"),
  // Folder prefix for private NID uploads vs public profile images.
  CLOUDINARY_NID_FOLDER: z.string().default("drive-offer/nid"),
  CLOUDINARY_PROFILE_FOLDER: z.string().default("drive-offer/profile"),

  NID_PROVIDER_URL: z.string().optional().default(""),
  NID_PROVIDER_KEY: z.string().optional().default(""),

  OTP_EXPIRY_SECONDS: z.coerce.number().default(300),
  OTP_MAX_ATTEMPTS: z.coerce.number().default(5),
  OTP_RESEND_COOLDOWN: z.coerce.number().default(60),

  PAYMENT_VERIFICATION_WINDOW_MINUTES: z.coerce.number().default(45),
  PAYMENT_VERIFICATION_TOLERANCE_MINUTES: z.coerce.number().default(5),

  DEVICE_HEARTBEAT_TIMEOUT_SECONDS: z.coerce.number().default(120),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),

  LOG_LEVEL: z.string().default("info"),

  CORS_ORIGINS: z.string().default("http://localhost:3000"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error(
    "❌ Invalid environment variables:",
    parsed.error.flatten().fieldErrors,
  );
  process.exit(1);
}

export const env = {
  ...parsed.data,
  isProduction: parsed.data.NODE_ENV === "production",
  isDevelopment: parsed.data.NODE_ENV === "development",
  isTest: parsed.data.NODE_ENV === "test",
  corsOrigins: parsed.data.CORS_ORIGINS.split(",").map((o) => o.trim()),
};
