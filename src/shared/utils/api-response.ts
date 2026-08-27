import { Response } from "express";

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
