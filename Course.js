const mongoose = require("mongoose");

const CourseSchema = new mongoose.Schema(
  {
    title: {
      type:     String,
      required: [true, "Kurs nomi majburiy"],
      trim:     true,
      maxlength:[120, "Kurs nomi 120 ta belgidan oshmasin"],
    },
    description: {
      type:     String,
      required: [true, "Tavsif majburiy"],
      maxlength:[1000],
    },
    shortDesc: {
      type:     String,
      maxlength:[200],
    },
    icon:     { type: String, default: "📚" },   // emoji yoki URL
    color:    { type: String, default: "#d64f6e" },
    bgColor:  { type: String, default: "#fde8ec" },

    isPro:    { type: Boolean, default: false },
    isPublished: { type: Boolean, default: false },

    order:    { type: Number, default: 0 },  // saralash uchun

    lessons:  [{ type: mongoose.Schema.Types.ObjectId, ref: "Lesson" }],

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

/* ── Virtual: dars soni ── */
CourseSchema.virtual("lessonCount").get(function () {
  return this.lessons?.length || 0;
});

module.exports = mongoose.model("Course", CourseSchema);
