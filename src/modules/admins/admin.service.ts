import argon2 from "argon2";
import { adminRepository } from "./admin.repository";
import { AdminStatus } from "./admin.model";
import { AppError, ForbiddenError } from "../../shared/errors/app-error";
import { normalizeEmail } from "../../shared/utils/normalize";
import { signAccessToken } from "../../shared/utils/jwt";
import type { AdminLoginBody } from "../auth/auth.schema";

export const adminAuthService = {
  async login(body: AdminLoginBody) {
    const emailNormalized = normalizeEmail(body.email);
    const admin = await adminRepository.findByEmailNormalized(
      emailNormalized,
      true,
    );

    if (!admin) {
      throw new AppError(
        "AUTH_INVALID_CREDENTIALS",
        "Invalid email or password",
        401,
      );
    }
    if (admin.status === AdminStatus.BLOCKED) {
      throw new ForbiddenError("This admin account has been blocked");
    }

    const valid = await argon2.verify(admin.passwordHash, body.password);
    if (!valid) {
      throw new AppError(
        "AUTH_INVALID_CREDENTIALS",
        "Invalid email or password",
        401,
      );
    }

    await adminRepository.updateLastLogin(admin._id.toString());

    // MVP simplification: admin sessions are a single stateless JWT (no
    // refresh-token rotation / authSessions record like customers get).
    // Revisit in Phase 11/12 if admin sessions need remote revocation.
    const accessToken = signAccessToken({
      sub: admin._id.toString(),
      type: "ADMIN",
    });

    return {
      accessToken,
      admin: { id: admin._id.toString(), name: admin.name, email: admin.email },
    };
  },
};
