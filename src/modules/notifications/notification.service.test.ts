import { describe, it, expect, vi, beforeEach } from "vitest";
import { Types } from "mongoose";
import { notificationService } from "./notification.service";
import { NotificationModel } from "./notification.model";
import { sendRealTimeNotification } from "../../config/socket";

vi.mock("./notification.model");
vi.mock("../../config/socket");
vi.mock("../../config/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Notification Service Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("send", () => {
    it("should save the notification and trigger real-time broadcast", async () => {
      const mockUserId = new Types.ObjectId();
      const mockRefId = new Types.ObjectId();
      
      const mockNotification = {
        _id: "notif-123",
        userId: mockUserId,
        type: "ORDER_CREATED",
        title: "Test Title",
        message: "Test Message",
        referenceType: "Order",
        referenceId: mockRefId,
        isRead: false,
        createdAt: new Date(),
      };

      vi.mocked(NotificationModel.create).mockResolvedValue(mockNotification as any);
      vi.mocked(sendRealTimeNotification).mockImplementation(() => {});

      const result = await notificationService.send({
        userId: mockUserId,
        type: "ORDER_CREATED",
        title: "Test Title",
        message: "Test Message",
        referenceType: "Order",
        referenceId: mockRefId,
      });

      expect(result).toEqual(mockNotification);
      expect(NotificationModel.create).toHaveBeenCalled();
      expect(sendRealTimeNotification).toHaveBeenCalledWith(
        mockUserId.toString(),
        expect.objectContaining({
          _id: "notif-123",
          type: "ORDER_CREATED",
          title: "Test Title",
          message: "Test Message",
        })
      );
    });
  });
});
