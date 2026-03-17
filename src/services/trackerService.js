/**
 * Tracker Service
 * Business logic for cycle tracking
 */

const Cycle = require("../models/Cycle");
const { MESSAGES } = require("../config/constants");

class TrackerService {
  async getTodayData(userId) {
    const cycle = await Cycle.findOne({ userId }).sort({ startDate: -1 });

    if (!cycle) {
      return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dayOfCycle = Math.floor((Date.now() - cycle.startDate) / 86400000) + 1;
    const daysUntilNext = Math.max(0, cycle.cycleLength - dayOfCycle);
    const todaySymptoms =
      cycle.symptoms.find((s) => s.date.toDateString() === today.toDateString()) ||
      null;

    return {
      dayOfCycle,
      daysUntilNext,
      cycleLength: cycle.cycleLength,
      todaySymptoms,
      cycleStartDate: cycle.startDate,
    };
  }

  async getAllCycles(userId) {
    const cycles = await Cycle.find({ userId })
      .sort({ startDate: -1 })
      .limit(12);

    let nextPeriod = null;

    if (cycles.length) {
      const avgLen = Math.round(
        cycles.slice(0, 3).reduce((s, c) => s + c.cycleLength, 0) /
          Math.min(cycles.length, 3)
      );
      nextPeriod = new Date(cycles[0].startDate);
      nextPeriod.setDate(nextPeriod.getDate() + avgLen);
    }

    return { cycles, nextPeriod };
  }

  async createCycle(userId, startDate, cycleLength, notes) {
    if (!startDate) {
      throw new Error(MESSAGES.CYCLE_START_REQUIRED);
    }

    const cycle = await Cycle.create({
      userId,
      startDate: new Date(startDate),
      cycleLength: cycleLength || 28,
      notes: notes || "",
    });

    return cycle;
  }

  async updateCycle(cycleId, userId, updateData) {
    const cycle = await Cycle.findOne({ _id: cycleId, userId });

    if (!cycle) {
      throw new Error(MESSAGES.CYCLE_NOT_FOUND);
    }

    const { endDate, cycleLength, notes, symptoms } = updateData;

    if (endDate) cycle.endDate = new Date(endDate);
    if (cycleLength) cycle.cycleLength = cycleLength;
    if (notes) cycle.notes = notes;
    if (symptoms) cycle.symptoms = symptoms;

    await cycle.save();

    return cycle;
  }

  async addOrUpdateSymptoms(userId, date, items, mood, painLevel, notes) {
    if (!date) {
      throw new Error("Sana majburiy");
    }

    const cycle = await Cycle.findOne({ userId }).sort({ startDate: -1 });

    if (!cycle) {
      throw new Error(MESSAGES.CYCLE_NOT_STARTED);
    }

    const d = new Date(date);
    const idx = cycle.symptoms.findIndex(
      (s) => s.date.toDateString() === d.toDateString()
    );

    if (idx >= 0) {
      cycle.symptoms[idx] = { date: d, items, mood, painLevel, notes };
    } else {
      cycle.symptoms.push({ date: d, items, mood, painLevel, notes });
    }

    await cycle.save();

    return cycle;
  }
}

module.exports = new TrackerService();
