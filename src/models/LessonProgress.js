/**
 * LessonProgress
 *
 * Tugatilgan darslar uchun alohida collection — User hujjatidagi
 * `completedLessons` massivi cheksiz o'sishining oldini oladi.
 *
 * Hozircha dual-write rejimida ishlaydi (User.completedLessons ham yangilanadi),
 * shuning uchun mavjud o'qishlar va frontend buzilmaydi. Keyinchalik o'qishlar
 * to'liq shu collection'ga ko'chirilishi mumkin.
 */

const mongoose = require("mongoose");

const lessonProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lesson",
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
    },
    completedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Bir foydalanuvchi bir darsni faqat bir marta tugatadi
lessonProgressSchema.index({ userId: 1, lessonId: 1 }, { unique: true });
lessonProgressSchema.index({ userId: 1, courseId: 1 });

module.exports = mongoose.model("LessonProgress", lessonProgressSchema);
