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

function getCyclePosition(cycleStartDate, cycleLength, now = new Date()) {
  const today = startOfDay(now);
  const start = startOfDay(cycleStartDate);
  const len = Number(cycleLength) || 28;

  if (today <= start) {
    return {
      dayOfCycle: 1,
      daysUntilNext: len,
      nextPeriod: new Date(start.getTime() + len * DAY_MS),
      today,
      start,
      len,
    };
  }

  const passed = Math.max(0, diffDays(start, today));
  const dayOfCycle = (passed % len) + 1;

  // Keyingi tsiklning boshlanish sanasi (har doim bugundan keyin).
  const periodsPassed = Math.floor(passed / len) + 1;
  const nextPeriod = new Date(start);
  nextPeriod.setDate(nextPeriod.getDate() + periodsPassed * len);

  // Home va calendar bir xil formula ishlatishi uchun shu qiymatni qaytaramiz.
  const daysUntilNext = diffDays(today, nextPeriod);

  return { dayOfCycle, daysUntilNext, nextPeriod, today, start, len };
}

class TrackerService {
  async getTodayData(userId) {
    const cycle = await Cycle.findOne({ userId }).sort({ startDate: -1 });

    if (!cycle) {
      return null;
    }

    const pos = getCyclePosition(cycle.startDate, cycle.cycleLength, new Date());
    const todaySymptoms =
      cycle.symptoms.find((s) => startOfDay(s.date).getTime() === pos.today.getTime()) || null;

    return {
      dayOfCycle: pos.dayOfCycle,
      daysUntilNext: pos.daysUntilNext,
      cycleLength: pos.len,
      todaySymptoms,
      cycleStartDate: pos.start,
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
      nextPeriod = getCyclePosition(cycles[0].startDate, avgLen, new Date()).nextPeriod;
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
