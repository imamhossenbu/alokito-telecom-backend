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
 * Requires a valid CUSTOMER access token. Populates req.actor.
 * Never trust userId from the request body/query for customer-owned
 * resources — always use req.actor.userId (spec section 70, 99).
 */
export function authMiddleware(
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
    if (payload.type !== "CUSTOMER") {
      return next(new UnauthorizedError("Invalid token type for this route"));
    }

    req.actor = {
      type: "CUSTOMER",
      userId: payload.sub,
      sessionId: payload.sessionId,
      deviceId: payload.deviceId,
    };
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return next(new UnauthorizedError("Access token expired"));
    }
    next(new UnauthorizedError("Invalid access token"));
  }
}
