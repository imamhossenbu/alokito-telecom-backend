/**
 * Create an admin, or reset an existing admin's password, directly in MongoDB.
 * Works even when the API server is down.
 *
 *   ADMIN_EMAIL=someone@example.com ADMIN_PASSWORD='secret' npm run admin:set
 *
 * - If the email exists: password is replaced, status set ACTIVE, role ADMIN.
 * - Otherwise: a new ACTIVE admin is created (ADMIN_NAME optional).
 * Credentials are read from env vars so they never live in source code.
 */
import mongoose from "mongoose";
import argon2 from "argon2";
import { env } from "../src/config/env";
import { AdminModel, AdminStatus } from "../src/modules/admins/admin.model";
import { normalizeEmail } from "../src/shared/utils/normalize";

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || "Super Admin";
  if (!email || !password) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD");
  }
  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters");
  }

  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  const emailNormalized = normalizeEmail(email);
  const passwordHash = await argon2.hash(password);

  const existing = await AdminModel.findOne({ emailNormalized });
  if (existing) {
    await AdminModel.updateOne(
      { _id: existing._id },
      { $set: { passwordHash, status: AdminStatus.ACTIVE, role: "ADMIN" } },
    );
    console.log(`Updated admin ${email}: password reset, status ACTIVE.`);
  } else {
    await AdminModel.create({
      name,
      email,
      emailNormalized,
      passwordHash,
      role: "ADMIN",
      status: AdminStatus.ACTIVE,
    });
    console.log(`Created admin ${email}.`);
  }

  // Verify the stored hash actually accepts the password.
  const check = await AdminModel.findOne({ emailNormalized }).select("+passwordHash status role").lean();
  const ok = !!check && (await argon2.verify(check.passwordHash, password));
  console.log(`Verification: login ${ok ? "OK" : "FAILED"} (status=${check?.status}, role=${check?.role})`);

  await mongoose.disconnect();
  if (!ok) process.exit(1);
}

main().catch(async (err) => {
  console.error(err instanceof Error ? err.message : err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
