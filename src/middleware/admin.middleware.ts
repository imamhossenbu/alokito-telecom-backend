import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { verifyAccessToken } from "../shared/utils/jwt";
import { UnauthorizedError } from "../shared/errors/app-error";

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim();
}

/**
 * Requires a valid ADMIN access token. There is only one admin role
 * (spec section 10, 56) — authorization here is binary: admin or not.
 */
export function adminMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const token = extractBearerToken(req);
  if (!token) {
    return next(new UnauthorizedError("Missing access token"));
  }

  try {
    const payload = verifyAccessToken(token);
    if (payload.type !== "ADMIN") {
      return next(new UnauthorizedError("Invalid token type for this route"));
    }

    req.actor = { type: "ADMIN", adminId: payload.sub };
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return next(new UnauthorizedError("Access token expired"));
    }
    next(new UnauthorizedError("Invalid access token"));
  }
}
