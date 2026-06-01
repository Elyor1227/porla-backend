/**
 * Tracker Controller
 */

const trackerService = require("../services/trackerService");
const { sendSuccess } = require("../utils/response");

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
      sendSuccess(res, { message: "Tsikl saqlandi", cycle }, 201);
    } catch (err) {
      next(err);
    }
  }

  async updateCycle(req, res, next) {
    try {
      const { id } = req.params;
      const cycle = await trackerService.updateCycle(id, req.user._id, req.body);
      sendSuccess(res, { message: "Tsikl yangilandi", cycle });
    } catch (err) {
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
      next(err);
    }
  }
}

module.exports = new TrackerController();
