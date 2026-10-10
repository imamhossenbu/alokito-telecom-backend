import { describe, it, expect, vi, beforeEach } from "vitest";
import { offerService } from "./offer.service";
import { offerRepository } from "./offer.repository";
import { operatorRepository } from "../operators/operator.repository";
import { auditLogService } from "../auditLogs/auditLog.service";
import { OfferStatus } from "./offer.model";
import { NotFoundError } from "../../shared/errors/app-error";
import { Types } from "mongoose";

vi.mock("./offer.repository");
vi.mock("../operators/operator.repository");
vi.mock("../auditLogs/auditLog.service");
vi.mock("../notifications/notification.service");

describe("Offer Service Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getActiveOfferById", () => {
    it("should return active offer", async () => {
      const mockOffer = { _id: new Types.ObjectId("507f1f77bcf86cd799439012"), name: "Bundle GP", status: OfferStatus.ACTIVE };
      vi.mocked(offerRepository.findById).mockResolvedValue(mockOffer as any);

      const result = await offerService.getActiveOfferById("507f1f77bcf86cd799439012");
      expect(result).toEqual(mockOffer);
    });

    it("should throw NotFoundError if offer status is INACTIVE", async () => {
      const mockOffer = { _id: new Types.ObjectId("507f1f77bcf86cd799439012"), name: "Bundle GP", status: OfferStatus.INACTIVE };
      vi.mocked(offerRepository.findById).mockResolvedValue(mockOffer as any);

      await expect(offerService.getActiveOfferById("507f1f77bcf86cd799439012")).rejects.toThrow(NotFoundError);
    });

    it("should throw NotFoundError if offer does not exist", async () => {
      vi.mocked(offerRepository.findById).mockResolvedValue(null);

      await expect(offerService.getActiveOfferById("507f1f77bcf86cd799439012")).rejects.toThrow(NotFoundError);
    });
  });

  describe("adminCreateOffer", () => {
    it("should create offer successfully if operator exists", async () => {
      const mockOperator = { _id: new Types.ObjectId("507f1f77bcf86cd799439011"), name: "Grameenphone" };
      const mockOffer = { _id: new Types.ObjectId("507f1f77bcf86cd799439012"), name: "Offer A", sellingPrice: 50000 };

      vi.mocked(operatorRepository.findById).mockResolvedValue(mockOperator as any);
      vi.mocked(offerRepository.create).mockResolvedValue(mockOffer as any);

      const result = await offerService.adminCreateOffer(
        {
          operatorId: "507f1f77bcf86cd799439011",
          name: "Offer A",
          category: "INTERNET",
          type: "Data",
          offerValue: "10GB",
          validity: "30 Days",
          sellingPrice: 500, // BDT
          status: "ACTIVE",
        },
        { id: "507f1f77bcf86cd799439013" }
      );

      expect(result).toEqual(mockOffer);
      expect(operatorRepository.findById).toHaveBeenCalledWith("507f1f77bcf86cd799439011");
      expect(offerRepository.create).toHaveBeenCalled();
      expect(auditLogService.log).toHaveBeenCalled();
    });

    it("should throw NotFoundError if operator is not found", async () => {
      vi.mocked(operatorRepository.findById).mockResolvedValue(null);

      await expect(
        offerService.adminCreateOffer(
          {
            operatorId: "507f1f77bcf86cd799439011",
            name: "Offer A",
            category: "INTERNET",
            type: "Data",
            offerValue: "10GB",
            validity: "30 Days",
            sellingPrice: 500,
            status: "ACTIVE",
          },
          { id: "507f1f77bcf86cd799439013" }
        )
      ).rejects.toThrow(NotFoundError);
    });
  });
});
