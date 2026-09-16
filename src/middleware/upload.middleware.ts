import multer from "multer";
import { Request } from "express";
import { ValidationError } from "../shared/errors/app-error";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
): void {
  let mime = file.mimetype;
  const ext = (file.originalname || "").toLowerCase().split(".").pop() || "";
  if (!ALLOWED_MIME_TYPES.has(mime)) {
    if (ext === "png") mime = "image/png";
    else if (ext === "jpg" || ext === "jpeg") mime = "image/jpeg";
    else if (ext === "webp") mime = "image/webp";
  }
  if (!ALLOWED_MIME_TYPES.has(mime)) {
    cb(new ValidationError("Only JPEG, PNG or WEBP images are allowed"));
    return;
  }
  file.mimetype = mime;
  cb(null, true);
}

/**
 * Memory storage: files never touch the local filesystem (spec section
 * 104 — stateless backend, no reliance on local disk for uploads). The
 * buffer is streamed straight to Cloudinary.
 */
export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 2 },
  fileFilter,
});
