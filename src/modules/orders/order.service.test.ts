import { describe, it, expect, vi, beforeEach } from "vitest";
import { orderService } from "./order.service";
import { orderRepository } from "./order.repository";
import { auditLogService } from "../auditLogs/auditLog.service";
import { notificationService } from "../notifications/notification.service";
import { OrderStatus } from "../../shared/enums";
import { AppError, NotFoundError } from "../../shared/errors/app-error";
import { Types } from "mongoose";

vi.mock("./order.repository");
vi.mock("../auditLogs/auditLog.service");
vi.mock("../notifications/notification.service");

describe("Order Service Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("adminProcessOrder", () => {
    it("should successfully change order status to PROCESSING", async () => {
      const mockOrder = {
        _id: new Types.ObjectId("507f1f77bcf86cd799439013"),
        orderStatus: OrderStatus.ACTIVATION_PENDING,
        activationStatus: "PENDING",
        userPhone: "01712345678",
        userId: new Types.ObjectId("507f1f77bcf86cd799439012"),
        save: vi.fn().mockResolvedValue(true),
      };

      vi.mocked(orderRepository.findById).mockResolvedValue(mockOrder as any);

      const result = await orderService.adminProcessOrder(
        "507f1f77bcf86cd799439013",
        "507f1f77bcf86cd799439011"
      );
      
      expect(result.orderStatus).toBe(OrderStatus.PROCESSING);
      expect(mockOrder.save).toHaveBeenCalled();
      expect(auditLogService.log).toHaveBeenCalled();
      expect(notificationService.send).toHaveBeenCalled();
    });

    it("should throw NotFoundError if order is not found", async () => {
      vi.mocked(orderRepository.findById).mockResolvedValue(null);

      await expect(
        orderService.adminProcessOrder("507f1f77bcf86cd799439013", "507f1f77bcf86cd799439011")
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw AppError if transitioning from invalid state", async () => {
      const mockOrder = {
        _id: new Types.ObjectId("507f1f77bcf86cd799439013"),
        orderStatus: OrderStatus.COMPLETED, // Invalid starting state to transition to PROCESSING
        save: vi.fn(),
      };

      vi.mocked(orderRepository.findById).mockResolvedValue(mockOrder as any);

      await expect(
        orderService.adminProcessOrder("507f1f77bcf86cd799439013", "507f1f77bcf86cd799439011")
      ).rejects.toThrow(AppError);
    });
  });
});
