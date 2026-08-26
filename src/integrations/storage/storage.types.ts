export interface UploadResult {
  /** Vendor-side identifier, stored in our DB instead of a raw URL. */
  publicId: string;
  /** Only meaningful for PUBLIC uploads (e.g. profile images). */
  url?: string;
  resourceType: "image";
  bytes: number;
  format: string;
}

export type StorageVisibility = "PUBLIC" | "PRIVATE";

export interface StorageProvider {
  /**
   * Uploads a file buffer. PRIVATE uploads (NID front/back) are never
   * publicly reachable — retrieving them always requires getSignedUrl().
   * PUBLIC uploads (profile images) get a stable, permanent URL back.
   */
  upload(
    buffer: Buffer,
    options: { folder: string; visibility: StorageVisibility },
  ): Promise<UploadResult>;

  /**
   * Generates a short-lived signed URL for a PRIVATE asset. `format` must
   * be the format returned at upload time (stored alongside publicId in
   * the DB) — Cloudinary needs it to build the signed resource path.
   * Callers must request a fresh URL each time they need to display/
   * download the file — never persist the signed URL itself (spec 78).
   */
  getSignedUrl(
    publicId: string,
    format: string,
    expiresInSeconds?: number,
  ): string;

  deleteAsset(publicId: string): Promise<void>;
}
