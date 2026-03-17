/**
 * Daily Tip Controller
 */

const dailyTipService = require("../services/dailyTipService");
const { sendSuccess, sendError } = require("../utils/response");

class DailyTipController {
  async getTodayTip(req, res, next) {
    try {
      const tip = await dailyTipService.getTodayTip();
      sendSuccess(res, { tip });
    } catch (err) {
      next(err);
    }
  }

  async getAllTips(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const category = req.query.category || "";

      const result = await dailyTipService.getAllTips(page, limit, category);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async getAllTipsAdmin(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 30, 100);
      const category = req.query.category || "";

      const result = await dailyTipService.getAllTipsAdmin(
        page,
        limit,
        category
      );
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async createTip(req, res, next) {
    try {
      const { content, category, emoji, publishDate, isActive } = req.body;
      const tip = await dailyTipService.createTip(
        content,
        category,
        emoji,
        publishDate,
        isActive,
        req.user._id
      );
      sendSuccess(
        res,
        {
          message: "Maslahat qo'shildi",
          tip,
        },
        201
      );
    } catch (err) {
      if (err.message.includes("belgi")) {
        return sendError(res, err.message, 400);
      }
      if (err.message.includes("formati")) {
        return sendError(res, err.message, 400);
      }
      next(err);
    }
  }

  async updateTip(req, res, next) {
    try {
      const { id } = req.params;
      const tip = await dailyTipService.updateTip(id, req.body);
      sendSuccess(res, {
        message: "Maslahat yangilandi",
        tip,
      });
    } catch (err) {
      if (err.message.includes("topilmadi")) {
        return sendError(res, err.message, 404);
      }
      if (err.message.includes("formati")) {
        return sendError(res, err.message, 400);
      }
      next(err);
    }
  }

  async deleteTip(req, res, next) {
    try {
      const { id } = req.params;
      await dailyTipService.deleteTip(id);
      sendSuccess(res, { message: "Maslahat o'chirildi" });
    } catch (err) {
      if (err.message.includes("topilmadi")) {
        return sendError(res, err.message, 404);
      }
      next(err);
    }
  }
}

module.exports = new DailyTipController();
