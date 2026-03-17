/**
 * Notification Controller
 */

const notificationService = require("../services/notificationService");
const { sendSuccess, sendError } = require("../utils/response");

class NotificationController {
  async getNotifications(req, res, next) {
    try {
      const result = await notificationService.getUserNotifications(
        req.user._id,
        20
      );
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async markAsRead(req, res, next) {
    try {
      const { id } = req.params;
      await notificationService.markAsRead(id, req.user._id);
      sendSuccess(res, {});
    } catch (err) {
      next(err);
    }
  }

  async markAllAsRead(req, res, next) {
    try {
      await notificationService.markAllAsRead(req.user._id);
      sendSuccess(res, { message: "Hammasi o'qildi" });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new NotificationController();
