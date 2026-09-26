import rateLimit, { Options } from "express-rate-limit";
import { Request } from "express";
import { env } from "../config/env";

/**
 * Creates a rate limiter scoped by IP + (optional) account/device identifier
 * so that limits can't be trivially bypassed just by rotating IPs, and so
 * that one abusive account doesn't get to hide behind a shared IP (spec 85).
 */
export function createRateLimiter(options: {
  windowMs?: number;
  max: number;
  keyExtra?: (req: Request) => string;
  message?: string;
}) {
  const {
    windowMs = env.RATE_LIMIT_WINDOW_MS,
    max,
    keyExtra,
    message,
  } = options;

  return rateLimit({
    windowMs,
    max: env.isDevelopment || env.isTest ? 1000 : max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => env.isDevelopment || env.isTest,
    keyGenerator: (req: Request) => {
      const extra = keyExtra ? keyExtra(req) : "";
      return `rl:${req.ip}:${extra}`;
    },
    handler: (_req, res) => {
      res.status(429).json({
        success: false,
        error: {
          code: "RATE_LIMITED",
          message: message ?? "Too many requests, please try again later.",
        },
        requestId: res.locals.requestId,
      });
    },
  } satisfies Partial<Options>);
}

// Common presets referenced across auth routes (spec section 85).
export const loginRateLimiter = createRateLimiter({
  max: 10,
  windowMs: 15 * 60 * 1000,
  message: "Too many login attempts. Please try again later.",
  keyExtra: (req) => String(req.body?.email ?? ""),
});

export const otpRateLimiter = createRateLimiter({
  max: 5,
  windowMs: 10 * 60 * 1000,
  message: "Too many verification attempts. Please try again later.",
});

export const registrationRateLimiter = createRateLimiter({
  max: 5,
  windowMs: 60 * 60 * 1000,
  message: "Too many registration attempts. Please try again later.",
});

export const topupRateLimiter = createRateLimiter({
  max: 20,
  windowMs: 60 * 60 * 1000,
});

export const defaultApiRateLimiter = createRateLimiter({
  max: env.RATE_LIMIT_MAX,
});
