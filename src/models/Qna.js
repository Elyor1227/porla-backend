/**
 * Q&A Model (Questions & Answers)
 */

const mongoose = require("mongoose");

const qnaSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: [true, "Savol matni majburiy"],
      maxlength: 2000,
      trim: true,
    },
    topic: {
      type: String,
      default: "",
    },
    answer: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "answered"],
      default: "pending",
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    askedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    askedName: {
      type: String,
      default: "",
    },
    contact: {
      type: String,
      default: "",
    },
    askedIp: {
      type: String,
      default: "",
    },
    answeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    answeredAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

qnaSchema.index({ isPublished: 1, answeredAt: -1 });
qnaSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Qna", qnaSchema);
