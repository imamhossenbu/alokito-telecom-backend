import { cloudinary } from "./cloudinary.config";
import {
  StorageProvider,
  StorageVisibility,
  UploadResult,
} from "./storage.types";
import { logger } from "../../config/logger";

/**
 * NID images use Cloudinary's "authenticated" delivery type, which
 * refuses to serve the asset without a valid signature — this is what
 * satisfies spec section 78's "private storage / signed URLs / restricted
 * access" requirement on Cloudinary's free tier (no S3 bucket needed).
 *
 * Profile images use the default "upload" delivery type since they're
 * meant to be publicly viewable.
 */
class CloudinaryStorageProvider implements StorageProvider {
  async upload(
    buffer: Buffer,
    options: { folder: string; visibility: StorageVisibility },
  ): Promise<UploadResult> {
    const { folder, visibility } = options;

    const result = await new Promise<{
      public_id: string;
      secure_url: string;
      bytes: number;
      format: string;
    }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: "image",
          type: visibility === "PRIVATE" ? "authenticated" : "upload",
          // Random public_id — never trust a user-provided filename (spec 102).
          use_filename: false,
          unique_filename: true,
          overwrite: false,
        },
        (err, res) => {
          if (err || !res)
            return reject(err ?? new Error("Cloudinary upload failed"));
          resolve(
            res as unknown as {
              public_id: string;
              secure_url: string;
              bytes: number;
              format: string;
            },
          );
        },
      );
      stream.end(buffer);
    });

    return {
      publicId: result.public_id,
      url: visibility === "PUBLIC" ? result.secure_url : undefined,
      resourceType: "image",
      bytes: result.bytes,
      format: result.format,
    };
  }

  getSignedUrl(
    publicId: string,
    format: string,
    expiresInSeconds = 300,
  ): string {
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;

    return cloudinary.utils.private_download_url(publicId, format, {
      resource_type: "image",
      type: "authenticated",
      expires_at: expiresAt,
      attachment: false,
    });
  }

  async deleteAsset(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId, {
        resource_type: "image",
        type: "authenticated",
        invalidate: true,
      });
    } catch (err) {
      // Also try as a public asset, in case the caller got the visibility wrong.
      try {
        await cloudinary.uploader.destroy(publicId, {
          resource_type: "image",
          type: "upload",
          invalidate: true,
        });
      } catch (err2) {
        logger.error(
          { err, err2, publicId },
          "Failed to delete Cloudinary asset",
        );
        throw err2;
      }
    }
  }
}

export const storageProvider: StorageProvider = new CloudinaryStorageProvider();
