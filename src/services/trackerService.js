/**
 * Tracker Service
 * Business logic for cycle tracking
 */

const Cycle = require("../models/Cycle");
const { MESSAGES } = require("../config/constants");

const DAY_MS = 86400000;

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function diffDays(from, to) {
  return Math.floor((startOfDay(to) - startOfDay(from)) / DAY_MS);
}

class TrackerService {
  async getTodayData(userId) {
    const cycle = await Cycle.findOne({ userId }).sort({ startDate: -1 });

    if (!cycle) {
      return null;
    }

    const today = startOfDay(new Date());
    const cycleStart = startOfDay(cycle.startDate);
    const cycleLength = Number(cycle.cycleLength) || 28;

    // Calendar va home ekranda bir xil bo'lishi uchun kunni "day boundary" bo'yicha hisoblaymiz.
    const passed = Math.max(0, diffDays(cycleStart, today));
    const dayOfCycle = (passed % cycleLength) + 1;
    const daysUntilNext = cycleLength - dayOfCycle;
    const todaySymptoms =
      cycle.symptoms.find((s) => startOfDay(s.date).getTime() === today.getTime()) || null;

    return {
      dayOfCycle,
      daysUntilNext,
      cycleLength,
      todaySymptoms,
      cycleStartDate: cycleStart,
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
      const latestStart = startOfDay(cycles[0].startDate);
      const today = startOfDay(new Date());
      const passed = diffDays(latestStart, today);

      if (passed < 0) {
        nextPeriod = latestStart;
      } else {
        const periodsPassed = Math.floor(passed / avgLen) + 1;
        nextPeriod = new Date(latestStart);
        nextPeriod.setDate(nextPeriod.getDate() + periodsPassed * avgLen);
      }
    }

    return { cycles, nextPeriod };
  }

  async createCycle(userId, startDate, cycleLength, notes) {
    if (!startDate) {
      throw new Error(MESSAGES.CYCLE_START_REQUIRED);
    }

    const cycle = await Cycle.create({
      userId,
      startDate: startOfDay(startDate),
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

    if (endDate) cycle.endDate = startOfDay(endDate);
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

    const d = startOfDay(date);
    const idx = cycle.symptoms.findIndex(
      (s) => startOfDay(s.date).getTime() === d.getTime()
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
