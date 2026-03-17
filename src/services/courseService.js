/**
 * Course Service
 * Business logic for course operations
 */

const Course = require("../models/Course");
const Lesson = require("../models/Lesson");
const { MESSAGES } = require("../config/constants");

class CourseService {
  async getAllCourses(user) {
    const courses = await Course.find({ isActive: true }).sort("order");

    const result = await Promise.all(
      courses.map(async (c) => {
        const lessonCount = await Lesson.countDocuments({
          courseId: c._id,
          isActive: true,
        });
        return {
          ...c.toObject(),
          lessonCount,
          isLocked: c.isPro && !user.isPro && !user.isAdmin,
        };
      })
    );

    return result;
  }

  async getCourseById(courseId, user) {
    const course = await Course.findById(courseId);
    if (!course) {
      throw new Error(MESSAGES.COURSE_NOT_FOUND);
    }

    // Check pro access
    if (course.isPro && !user.isPro && !user.isAdmin) {
      const error = new Error(MESSAGES.COURSE_LOCKED);
      error.isPro = true;
      error.statusCode = 403;
      throw error;
    }

    // Get lessons with progress
    const lessons = await Lesson.find({
      courseId: course._id,
      isActive: true,
    }).sort("order");

    const completedIds = user.completedLessons.map((id) => id.toString());
    const isUserPro = user.isPro || user.isAdmin;

    const withProgress = lessons.map((l, idx) => {
      const obj = l.toObject();
      const isCompleted = completedIds.includes(l._id.toString());
      const isLocked = idx > 0 && !isUserPro;

      return {
        ...obj,
        isCompleted,
        isLocked,
        content: isLocked ? "" : obj.content,
        videoUrl: isLocked ? "" : obj.videoUrl,
      };
    });

    return { course, lessons: withProgress };
  }

  async getLessonById(courseId, lessonId, user) {
    const lesson = await Lesson.findOne({
      _id: lessonId,
      courseId: courseId,
      isActive: true,
    });

    if (!lesson) {
      throw new Error(MESSAGES.LESSON_NOT_FOUND);
    }

    // Get all lessons for navigation
    const allLessons = await Lesson.find({
      courseId: courseId,
      isActive: true,
    }).sort("order");

    const idx = allLessons.findIndex(
      (l) => l._id.toString() === lesson._id.toString()
    );
    const isUserPro = user.isPro || user.isAdmin;

    // Check pro access (first lesson is free)
    if (idx > 0 && !isUserPro) {
      const error = new Error(MESSAGES.COURSE_LOCKED);
      error.isPro = true;
      error.statusCode = 403;
      throw error;
    }

    const completedIds = user.completedLessons.map((id) => id.toString());
    const isCompleted = completedIds.includes(lesson._id.toString());

    // Next lesson
    const nextRaw = allLessons[idx + 1] || null;
    const nextLesson = nextRaw
      ? {
          _id: nextRaw._id,
          title: nextRaw.title,
          duration: nextRaw.duration,
          order: nextRaw.order,
          isLocked: idx + 1 > 0 && !isUserPro,
          isCompleted: completedIds.includes(nextRaw._id.toString()),
        }
      : null;

    // Previous lesson
    const prevRaw = allLessons[idx - 1] || null;
    const prevLesson = prevRaw
      ? {
          _id: prevRaw._id,
          title: prevRaw.title,
          duration: prevRaw.duration,
          order: prevRaw.order,
        }
      : null;

    return {
      lesson: { ...lesson.toObject(), isCompleted },
      navigation: {
        current: idx + 1,
        total: allLessons.length,
        prevLesson,
        nextLesson,
      },
    };
  }

  async completeLesson(courseId, lessonId, user) {
    const lesson = await Lesson.findOne({
      _id: lessonId,
      courseId: courseId,
      isActive: true,
    });

    if (!lesson) {
      throw new Error(MESSAGES.LESSON_NOT_FOUND);
    }

    // Get all lessons for navigation and pro check
    const allLessons = await Lesson.find({
      courseId: courseId,
      isActive: true,
    }).sort("order");

    const idx = allLessons.findIndex(
      (l) => l._id.toString() === lesson._id.toString()
    );
    const isUserPro = user.isPro || user.isAdmin;

    // Check pro access
    if (idx > 0 && !isUserPro) {
      const error = new Error(MESSAGES.COURSE_LOCKED);
      error.statusCode = 403;
      throw error;
    }

    // Mark as completed
    const already = user.completedLessons.some(
      (id) => id.toString() === lesson._id.toString()
    );

    if (!already) {
      user.completedLessons.push(lesson._id);
      await user.save({ validateBeforeSave: false });

      // Create achievement notification every 5 lessons
      const count = user.completedLessons.length;
      if (count % 5 === 0) {
        await Notification.create({
          userId: user._id,
          title: `🏆 ${count} ta dars tugallandi!`,
          message: `Ajoyib! Siz ${count} ta darsni tugalladingiz. Shunday davom eting!`,
          type: "achievement",
        }).catch(() => {});
      }
    }

    // Get next lesson
    const completedIds = user.completedLessons.map((id) => id.toString());
    const nextRaw = allLessons[idx + 1] || null;
    const nextLesson = nextRaw
      ? {
          _id: nextRaw._id,
          title: nextRaw.title,
          duration: nextRaw.duration,
          order: nextRaw.order,
          isLocked: idx + 1 > 0 && !isUserPro,
          isCompleted: completedIds.includes(nextRaw._id.toString()),
        }
      : null;

    // Check if course is completed
    const courseCompleted = !nextRaw;

    if (courseCompleted && !already) {
      await Notification.create({
        userId: user._id,
        title: "🎓 Kurs tugallandi!",
        message: `Tabriklaymiz! Siz "${lesson.courseId}" kursini to'liq tugatdingiz.`,
        type: "achievement",
      }).catch(() => {});
    }

    return {
      completedCount: user.completedLessons.length,
      courseCompleted,
      nextLesson,
    };
  }
}

const Notification = require("../models/Notification");

module.exports = new CourseService();
