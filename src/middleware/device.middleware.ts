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
 * Requires a valid PAYMENT_DEVICE credential (issued after successful
 * pairing — spec section 47, 73). adminId is derived from the credential
 * itself, never trusted from the request body, so a device can never
 * submit events on behalf of another admin (Invariant 8, spec 129).
 */
export function paymentDeviceMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const token = extractBearerToken(req);
  if (!token) {
    return next(new UnauthorizedError("Missing device credential"));
  }

  try {
    const payload = verifyAccessToken(token);
    if (payload.type !== "PAYMENT_DEVICE") {
      return next(
        new UnauthorizedError("Invalid credential type for this route"),
      );
    }

    req.actor = {
      type: "PAYMENT_DEVICE",
      paymentDeviceId: payload.sub,
      adminId: payload.adminId,
      deviceId: payload.deviceId,
    };
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return next(new UnauthorizedError("Device credential expired"));
    }
    next(new UnauthorizedError("Invalid device credential"));
  }
}
