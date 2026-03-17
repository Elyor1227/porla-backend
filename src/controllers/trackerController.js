/**
 * Tracker Controller
 */

const trackerService = require("../services/trackerService");
const { sendSuccess, sendError } = require("../utils/response");

class TrackerController {
  async getTodayData(req, res, next) {
    try {
      const data = await trackerService.getTodayData(req.user._id);
      sendSuccess(res, { data });
    } catch (err) {
      next(err);
    }
  }

  async getAllCycles(req, res, next) {
    try {
      const result = await trackerService.getAllCycles(req.user._id);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async createCycle(req, res, next) {
    try {
      const { startDate, cycleLength, notes } = req.body;
      const cycle = await trackerService.createCycle(
        req.user._id,
        startDate,
        cycleLength,
        notes
      );
      sendSuccess(res, {
        message: "Tsikl saqlandi",
        cycle,
      }, 201);
    } catch (err) {
      if (err.message.includes("majburiy")) {
        return sendError(res, err.message, 400);
      }
      next(err);
    }
  }

  async updateCycle(req, res, next) {
    try {
      const { id } = req.params;
      const cycle = await trackerService.updateCycle(id, req.user._id, req.body);
      sendSuccess(res, {
        message: "Tsikl yangilandi",
        cycle,
      });
    } catch (err) {
      if (err.message.includes("topilmadi")) {
        return sendError(res, err.message, 404);
      }
      next(err);
    }
  }

  async addOrUpdateSymptoms(req, res, next) {
    try {
      const { date, items, mood, painLevel, notes } = req.body;
      await trackerService.addOrUpdateSymptoms(
        req.user._id,
        date,
        items || [],
        mood || "",
        painLevel || 0,
        notes || ""
      );
      sendSuccess(res, { message: "Belgilar saqlandi" });
    } catch (err) {
      if (err.message.includes("majburiy")) {
        return sendError(res, err.message, 400);
      }
      if (err.message.includes("boshlang")) {
        return sendError(res, err.message, 404);
      }
      next(err);
    }
  }
}

module.exports = new TrackerController();
