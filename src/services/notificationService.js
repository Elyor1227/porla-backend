/**
 * Notification Service
 */

const Notification = require("../models/Notification");
const User = require("../models/User");

class NotificationService {
  async getUserNotifications(userId, limit = 20) {
    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit);

    const unreadCount = await Notification.countDocuments({
      userId,
      isRead: false,
    });

    return { notifications, unreadCount };
  }

  async markAsRead(notificationId, userId) {
    await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { isRead: true }
    );
  }

  async markAllAsRead(userId) {
    await Notification.updateMany({ userId }, { isRead: true });
  }

  async createNotification(userId, title, message, type = "info") {
    return await Notification.create({
      userId,
      title,
      message,
      type,
    });
  }

  async broadcastNotification(title, message, type = "info", onlyPro = false) {
    const query = onlyPro ? { isPro: true } : {};
    const users = await User.find(query).select("_id");

    return await Notification.insertMany(
      users.map((u) => ({
        userId: u._id,
        title,
        message,
        type,
      }))
    );
  }
}

module.exports = new NotificationService();
