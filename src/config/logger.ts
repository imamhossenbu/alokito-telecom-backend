import pino from "pino";
import { env } from "./env";

// Fields that must NEVER be logged (spec section 89).
const REDACT_PATHS = [
  "req.headers.authorization",
  "req.headers.cookie",
  "req.body.pin",
  "req.body.currentPin",
  "req.body.newPin",
  "req.body.confirmPin",
  "req.body.code",
  "req.body.accessToken",
  "req.body.refreshToken",
  "req.body.password",
  "req.body.nidNumber",
  "*.pin",
  "*.pinHash",
  "*.otp",
  "*.otpHash",
  "*.codeHash",
  "*.accessToken",
  "*.refreshToken",
  "*.refreshTokenHash",
];

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: REDACT_PATHS,
    censor: "[REDACTED]",
  },
  transport: env.isDevelopment
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss",
          ignore: "pid,hostname",
        },
      }
    : undefined,
  formatters: {
    level: (label) => ({ level: label }),
  },
  base: {
    service: "drive-offer-backend",
  },
});
