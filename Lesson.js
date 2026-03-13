const mongoose = require("mongoose");

const LessonSchema = new mongoose.Schema(
  {
    title: {
      type:     String,
      required: [true, "Dars nomi majburiy"],
      trim:     true,
      maxlength:[150],
    },
    content: {
      type:     String,
      required: [true, "Dars matni majburiy"],
    },
    // Rich media
    videoUrl:     { type: String, default: null },
    duration:     { type: Number, default: 0 },  // daqiqada
    coverImage:   { type: String, default: null },

    // Taxonomy
    course:       { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    order:        { type: Number, default: 0 },

    // Access
    isPro:        { type: Boolean, default: false },
    isPublished:  { type: Boolean, default: false },

    // Quiz (optional)
    quiz: [
      {
        question: String,
        options:  [String],
        correct:  Number,  // index of correct option
      },
    ],

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Lesson", LessonSchema);
