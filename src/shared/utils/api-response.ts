import { Response } from "express";
import { createHash } from "crypto";

interface SuccessOptions<T> {
  data: T;
  meta?: object;
  statusCode?: number;
}

export function sendSuccess<T>(
  res: Response,
  options: SuccessOptions<T>,
): Response {
  const { data, meta, statusCode = 200 } = options;

  // Bandwidth saver: the body carries a per-request `requestId`, which would make
  // Express's auto-ETag different on every call and defeat HTTP caching. Derive the
  // ETag from the payload only, so polling clients that send `If-None-Match` get an
  // empty 304 when nothing changed (Express handles the 304 via `req.fresh`).
  if (statusCode === 200) {
    const hash = createHash("sha1")
      .update(JSON.stringify({ data, meta: meta ?? null }))
      .digest("base64url");
    res.setHeader("ETag", `W/"${hash}"`);
    res.setHeader("Cache-Control", "private, no-cache");
  }

  return res.status(statusCode).json({
    success: true,
    data,
    ...(meta ? { meta } : {}),
    requestId: res.locals.requestId,
  });
}

export function sendCreated<T>(
  res: Response,
  data: T,
  meta?: object,
): Response {
  return sendSuccess(res, { data, meta, statusCode: 201 });
}
