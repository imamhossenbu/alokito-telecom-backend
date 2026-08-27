import { Types } from "mongoose";
import { NotificationModel } from "./notification.model";
import { NotFoundError, AppError } from "../../shared/errors/app-error";
import { sendRealTimeNotification } from "../../config/socket";
import { logger } from "../../config/logger";

export const notificationService = {
  async send(data: {
    userId: Types.ObjectId;
    type: string;
    title: string;
    message: string;
    referenceType?: string;
    referenceId?: Types.ObjectId;
  }) {
    const notification = await NotificationModel.create(data);
    try {
      sendRealTimeNotification(data.userId.toString(), {
        _id: notification._id.toString(),
        type: notification.type,
        title: notification.title,
        message: notification.message,
        referenceType: notification.referenceType,
        referenceId: notification.referenceId?.toString(),
        isRead: notification.isRead,
        createdAt: notification.createdAt,
      });
    } catch (err) {
      logger.error({ err, userId: data.userId }, "Failed to broadcast real-time notification");
    }
    return notification;
  },

  async getNotifications(userId: string, page = 1, limit = 20) {
    const filter = { userId: new Types.ObjectId(userId) };
    const total = await NotificationModel.countDocuments(filter);
    const docs = await NotificationModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return { total, page, limit, docs };
  },

  async getNotificationById(userId: string, id: string) {
    const doc = await NotificationModel.findById(id);
    if (!doc) {
      throw new NotFoundError("NOT_FOUND", "Notification not found");
    }
    if (doc.userId.toString() !== userId) {
      throw new AppError("UNAUTHORIZED", "You do not own this notification", 401);
    }
    return doc;
  },

  async markAsRead(userId: string, id: string) {
    const doc = await this.getNotificationById(userId, id);
    doc.isRead = true;
    doc.readAt = new Date();
    await doc.save();
    return doc;
  },

  async markAllAsRead(userId: string) {
    await NotificationModel.updateMany(
      { userId: new Types.ObjectId(userId), isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );
    return { success: true };
  },
};
