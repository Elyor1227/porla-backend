/**
 * Daily Tip Model
 */

const mongoose = require("mongoose");

const dailyTipSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: [true, "Matn majburiy"],
      trim: true,
      maxlength: 600,
    },
    category: {
      type: String,
      enum: ["sog'liq", "ovqatlanish", "jismoniy", "ruhiy", "sikl", "umumiy"],
      default: "umumiy",
    },
    emoji: {
      type: String,
      default: "💡",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    publishDate: {
      type: String,
      default: "", // "YYYY-MM-DD" format
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DailyTip", dailyTipSchema);
