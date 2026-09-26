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
  JWT_ACCESS_EXPIRES: z.string().default("365d"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(16, "JWT_REFRESH_SECRET must be at least 16 chars"),
  JWT_REFRESH_EXPIRES: z.string().default("30d"),

  REDIS_URL: z.string().optional(),

  // Nodemailer over SMTP — works with any provider (Gmail App Password,
  // Brevo/Sendinblue free tier, Mailtrap for dev testing, etc).
  SMTP_HOST: z.string().default("smtp.gmail.com"),
  SMTP_PORT: z.coerce.number().default(465),
  SMTP_SECURE: z.coerce.boolean().default(true),
  SMTP_USER: z.string().default("imam.adsfixter@gmail.com"),
  SMTP_PASS: z.string().default("qcjfctlkqqgunrtv"),
  EMAIL_FROM: z.string().default("Alokito Telecom <imam.adsfixter@gmail.com>"),

  // HTTP Email APIs (Port 443 — bypasses Render Free Tier SMTP port blocking)
  RESEND_API_KEY: z.string().default("re_5CGD1ywU_EcP1TKv1PcqCRz6KbiSJ7gN3"),
  BREVO_API_KEY: z.string().optional().default(""),

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

  CORS_ORIGINS: z.string().default("http://localhost:3000, https://alokito-telecom-1.onrender.com, http://localhost:59211"),
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
