/**
 * Lesson Model
 */

const mongoose = require("mongoose");

const lessonSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    videoUrl: {
      type: String,
      default: "",
    },
    /** Server diski (local) yoki S3 object key */
    videoFile: {
      type: String,
      default: "",
    },
    /** local — uploads/videos; s3 — S3/R2/MinIO (VIDEO_STORAGE=s3) */
    videoStorage: {
      type: String,
      enum: ["local", "s3"],
      default: "local",
    },
    duration: {
      type: Number,
      default: 0,
    },
    order: {
      type: Number,
      default: 0,
    },
    isPro: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

lessonSchema.index({ courseId: 1, isActive: 1, order: 1 });

module.exports = mongoose.model("Lesson", lessonSchema);
