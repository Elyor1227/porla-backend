/**
 * Course Admin Service
 */

const Course = require("../models/Course");
const Lesson = require("../models/Lesson");
const { MESSAGES } = require("../config/constants");

class CourseAdminService {
  async getAllCourses() {
    const courses = await Course.find().sort("order");

    const result = await Promise.all(
      courses.map(async (c) => ({
        ...c.toObject(),
        lessonCount: await Lesson.countDocuments({ courseId: c._id }),
      }))
    );

    return result;
  }

  async createCourse(title, description, icon, color, bgColor, isPro, order) {
    if (!title || !description) {
      throw new Error("Sarlavha va tavsif majburiy");
    }

    const course = await Course.create({
      title,
      description,
      icon: icon || "📚",
      color: color || "#d64f6e",
      bgColor: bgColor || "#fde8ec",
      isPro: isPro || false,
      order: order || 0,
    });

    return course;
  }

  async updateCourse(courseId, updates) {
    const course = await Course.findByIdAndUpdate(courseId, updates, {
      new: true,
      runValidators: true,
    });

    if (!course) {
      throw new Error(MESSAGES.COURSE_NOT_FOUND);
    }

    return course;
  }

  async deleteCourse(courseId) {
    const course = await Course.findById(courseId);

    if (!course) {
      throw new Error(MESSAGES.COURSE_NOT_FOUND);
    }

    await Promise.all([
      Course.findByIdAndDelete(courseId),
      Lesson.deleteMany({ courseId }),
    ]);

    return course;
  }

  async getLessons(courseId) {
    const lessons = await Lesson.find({ courseId }).sort("order");
    return lessons;
  }

  async createLesson(courseId, title, content, videoUrl, duration, order, isPro) {
    if (!title || !content) {
      throw new Error("Sarlavha va mazmun majburiy");
    }

    const course = await Course.findById(courseId);
    if (!course) {
      throw new Error(MESSAGES.COURSE_NOT_FOUND);
    }

    const lesson = await Lesson.create({
      courseId,
      title,
      content,
      videoUrl: videoUrl || "",
      duration: duration || 0,
      order: order || 0,
      isPro: isPro !== undefined ? isPro : course.isPro,
    });

    return lesson;
  }

  async updateLesson(courseId, lessonId, updates) {
    const lesson = await Lesson.findOneAndUpdate(
      { _id: lessonId, courseId },
      updates,
      { returnDocument: "after", runValidators: true }
    );

    if (!lesson) {
      throw new Error(MESSAGES.LESSON_NOT_FOUND);
    }

    return lesson;
  }

  async deleteLesson(courseId, lessonId) {
    const lesson = await Lesson.findOneAndDelete({
      _id: lessonId,
      courseId,
    });

    if (!lesson) {
      throw new Error(MESSAGES.LESSON_NOT_FOUND);
    }

    return lesson;
  }

  async seedData() {
    if ((await Course.countDocuments()) > 0) {
      throw new Error("Ma'lumotlar allaqon mavjud");
    }

    const courses = await Course.insertMany([
      {
        title: "Ayollar reproduktiv tizimi",
        description:
          "Reproduktiv organlar, ularning vazifalari va asosiy tushunchalar.",
        icon: "🩺",
        color: "#3b7de8",
        bgColor: "#eff6ff",
        isPro: false,
        order: 1,
      },
      {
        title: "Hayz sikli",
        description:
          "Normal tsikl, uning fazalari, ta'sir etuvchi omillar va kuzatish.",
        icon: "🌸",
        color: "#d64f6e",
        bgColor: "#fde8ec",
        isPro: false,
        order: 2,
      },
      {
        title: "Ayol gormonlari salomatlikdagi o'rni",
        description:
          "Gormonlar, ularning muvozanati va sog'liqqa ta'siri.",
        icon: "⚗️",
        color: "#8657d6",
        bgColor: "#f3f0ff",
        isPro: true,
        order: 3,
      },
      {
        title: "Vaginal ajralmalar",
        description:
          "Normal va g'ayri-normal ajralmalarni farqlash.",
        icon: "💧",
        color: "#0891b2",
        bgColor: "#ecfeff",
        isPro: true,
        order: 4,
      },
      {
        title: "Anemiya",
        description:
          "Temir tanqisligi, belgilari, sabablari va davolash usullari.",
        icon: "🩸",
        color: "#dc2626",
        bgColor: "#fef2f2",
        isPro: true,
        order: 5,
      },
    ]);

    const lessons = [];
    courses.forEach((c) => {
      for (let i = 1; i <= (c.isPro ? 3 : 2); i++) {
        lessons.push({
          courseId: c._id,
          title: `${c.title} — ${i}-dars`,
          content: `Bu ${c.title} kursining ${i}-darsi.`,
          duration: 10 + i * 5,
          order: i,
          isPro: c.isPro,
        });
      }
    });

    await Lesson.insertMany(lessons);

    return {
      courses: courses.length,
      lessons: lessons.length,
    };
  }
}

module.exports = new CourseAdminService();
