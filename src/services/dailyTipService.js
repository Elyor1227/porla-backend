/**
 * Daily Tip Service
 */

const DailyTip = require("../models/DailyTip");
const AppError = require("../utils/AppError");

class DailyTipService {
  async getTodayTip() {
    const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

    // Check if there's a tip for today
    let tip = await DailyTip.findOne({
      isActive: true,
      publishDate: today,
    });

    // Otherwise, rotate through general tips
    if (!tip) {
      const general = await DailyTip.find({
        isActive: true,
        publishDate: "",
      });

      if (general.length) {
        const dayIndex = Math.floor(Date.now() / 86400000); // epoch days
        tip = general[dayIndex % general.length];
      }
    }

    if (!tip) {
      return null;
    }

    return {
      _id: tip._id,
      content: tip.content,
      category: tip.category,
      emoji: tip.emoji,
    };
  }

  async getAllTips(page, limit, category) {
    const query = { isActive: true };

    if (category) {
      query.category = category;
    }

    const [tips, total] = await Promise.all([
      DailyTip.find(query)
        .sort({ publishDate: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select("content category emoji publishDate"),
      DailyTip.countDocuments(query),
    ]);

    return {
      tips,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getAllTipsAdmin(page, limit, category) {
    const query = {};

    if (category) {
      query.category = category;
    }

    const [tips, total] = await Promise.all([
      DailyTip.find(query)
        .sort({ publishDate: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("createdBy", "name"),
      DailyTip.countDocuments(query),
    ]);

    return {
      tips,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async createTip(content, category, emoji, publishDate, isActive, createdBy) {
    if (!content || content.trim().length < 5) {
      throw AppError.badRequest("Maslahat matni kamida 5 ta belgi", "CONTENT_MIN");
    }

    if (publishDate && !/^\d{4}-\d{2}-\d{2}$/.test(publishDate)) {
      throw AppError.badRequest("publishDate formati: YYYY-MM-DD", "INVALID_DATE_FORMAT");
    }

    const tip = await DailyTip.create({
      content: content.trim(),
      category: category || "umumiy",
      emoji: emoji || "💡",
      publishDate: publishDate || "",
      isActive: isActive !== false,
      createdBy,
    });

    return tip;
  }

  async updateTip(id, updates) {
    const allowed = ["content", "category", "emoji", "publishDate", "isActive"];
    const update = {};

    allowed.forEach((k) => {
      if (updates[k] !== undefined) {
        update[k] = updates[k];
      }
    });

    if (
      update.publishDate &&
      !/^\d{4}-\d{2}-\d{2}$/.test(update.publishDate) &&
      update.publishDate !== ""
    ) {
      throw AppError.badRequest("publishDate formati: YYYY-MM-DD", "INVALID_DATE_FORMAT");
    }

    const tip = await DailyTip.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });

    if (!tip) {
      throw AppError.notFound("Maslahat topilmadi", "TIP_NOT_FOUND");
    }

    return tip;
  }

  async deleteTip(id) {
    const tip = await DailyTip.findByIdAndDelete(id);

    if (!tip) {
      throw AppError.notFound("Maslahat topilmadi", "TIP_NOT_FOUND");
    }

    return tip;
  }
}

module.exports = new DailyTipService();
