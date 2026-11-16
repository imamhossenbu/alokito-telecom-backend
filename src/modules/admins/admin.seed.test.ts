import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("./admin.model", () => ({
  AdminModel: { estimatedDocumentCount: vi.fn() },
  AdminStatus: { ACTIVE: "ACTIVE" },
}));
vi.mock("./admin.repository", () => ({ adminRepository: { create: vi.fn() } }));
vi.mock("../../config/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { adminAuthService } from "./admin.service";
import { AdminModel } from "./admin.model";
import { adminRepository } from "./admin.repository";

describe("seedDefaultAdmin (no hardcoded credentials)", () => {
  const env = { ...process.env };
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => {
    process.env = { ...env };
  });

  it("never touches the DB when admins already exist", async () => {
    vi.mocked(AdminModel.estimatedDocumentCount).mockResolvedValue(2 as never);
    process.env.ADMIN_SEED_EMAIL = "owner@example.com";
    process.env.ADMIN_SEED_PASSWORD = "a-long-secret-123";
    await adminAuthService.seedDefaultAdmin();
    expect(adminRepository.create).not.toHaveBeenCalled();
  });

  it("does not create an admin without env credentials", async () => {
    vi.mocked(AdminModel.estimatedDocumentCount).mockResolvedValue(0 as never);
    delete process.env.ADMIN_SEED_EMAIL;
    delete process.env.ADMIN_SEED_PASSWORD;
    await adminAuthService.seedDefaultAdmin();
    expect(adminRepository.create).not.toHaveBeenCalled();
  });

  it("rejects short seed passwords", async () => {
    vi.mocked(AdminModel.estimatedDocumentCount).mockResolvedValue(0 as never);
    process.env.ADMIN_SEED_EMAIL = "owner@example.com";
    process.env.ADMIN_SEED_PASSWORD = "admin123";
    await adminAuthService.seedDefaultAdmin();
    expect(adminRepository.create).not.toHaveBeenCalled();
  });

  it("creates the first admin from env on an empty DB", async () => {
    vi.mocked(AdminModel.estimatedDocumentCount).mockResolvedValue(0 as never);
    process.env.ADMIN_SEED_EMAIL = "owner@example.com";
    process.env.ADMIN_SEED_PASSWORD = "a-long-secret-123";
    await adminAuthService.seedDefaultAdmin();
    expect(adminRepository.create).toHaveBeenCalledTimes(1);
    const arg = vi.mocked(adminRepository.create).mock.calls[0][0] as { email: string; passwordHash: string };
    expect(arg.email).toBe("owner@example.com");
    expect(arg.passwordHash).not.toContain("a-long-secret-123");
  });
});
