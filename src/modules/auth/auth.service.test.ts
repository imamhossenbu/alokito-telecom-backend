import { describe, it, expect, vi, beforeEach } from "vitest";
import { authService } from "./auth.service";
import { userRepository } from "../users/user.repository";
import { VerificationSessionModel } from "./verificationSession.model";
import { queueEmail } from "../../jobs/email.job";
import { Types } from "mongoose";

vi.mock("../users/user.repository");
vi.mock("./verificationSession.model");
vi.mock("../../jobs/email.job");
vi.mock("../../config/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Auth Service Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("forgotPin", () => {
    it("should successfully generate and queue an OTP email for valid user", async () => {
      const mockUserId = new Types.ObjectId("507f1f77bcf86cd799439011");
      const mockUser = {
        _id: mockUserId,
        email: "test@mail.com",
        phoneNumber: "01712345678",
      };

      const mockSession = {
        _id: new Types.ObjectId("507f1f77bcf86cd799439012"),
        phoneNumber: "01712345678",
        code: "123456",
        expiresAt: new Date(Date.now() + 300 * 1000),
      };

      vi.mocked(userRepository.findByEmailNormalized).mockResolvedValue(mockUser as any);
      vi.mocked(VerificationSessionModel.create).mockResolvedValue(mockSession as any);
      vi.mocked(queueEmail).mockResolvedValue(undefined);

      const result = await authService.forgotPin({
        email: "test@mail.com",
      });

      expect(result.verificationId).toBe("507f1f77bcf86cd799439012");
      expect(userRepository.findByEmailNormalized).toHaveBeenCalledWith("test@mail.com");
      expect(VerificationSessionModel.create).toHaveBeenCalled();
      expect(queueEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "test@mail.com",
          subject: expect.stringMatching(/verification code|ওটিপি কোড/i),
        })
      );
    });
  });
});
