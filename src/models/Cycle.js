/**
 * Cycle Model (Menstrual Cycle Tracker)
 */

const mongoose = require("mongoose");

const cycleSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    startDate: {
      type: Date,
      required: [true, "Boshlanish sanasi majburiy"],
    },
    endDate: {
      type: Date,
      default: null,
    },
    cycleLength: {
      type: Number,
      default: 28,
      min: 15,
      max: 60,
    },
    symptoms: [
      {
        date: {
          type: Date,
          required: true,
        },
        items: [String],
        mood: {
          type: String,
          enum: ["happy", "neutral", "sad", "anxious", "angry", ""],
          default: "",
        },
        painLevel: {
          type: Number,
          min: 0,
          max: 10,
          default: 0,
        },
        notes: {
          type: String,
          default: "",
        },
      },
    ],
    notes: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Cycle", cycleSchema);
