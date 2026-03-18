/**
 * Course Controller
 */

const courseService = require("../services/courseService");
const { sendSuccess, sendError } = require("../utils/response");

class CourseController {
  async getAllCourses(req, res, next) {
    try {
      const courses = await courseService.getAllCourses(req.user);
      sendSuccess(res, { courses });
    } catch (err) {
      next(err);
    }
  }

  async getCourseById(req, res, next) {
    try {
      const { id } = req.params;
      const result = await courseService.getCourseById(id, req.user);
      sendSuccess(res, result);
    } catch (err) {
      // if (err.isPro) {
      //   return sendError(res, err.message, 403, { isPro: true });
      // }
      if (err.message.includes("topilmadi")) {
        return sendError(res, err.message, 404);
      }
      next(err);
    }
  }

  async getLessonById(req, res, next) {
    try {
      const { courseId, lessonId } = req.params;
      const result = await courseService.getLessonById(courseId, lessonId, req.user);
      sendSuccess(res, result);
    } catch (err) {
      if (err.isPro) {
        return sendError(res, err.message, 403, { isPro: true });
      }
      if (err.message.includes("topilmadi")) {
        return sendError(res, err.message, 404);
      }
      next(err);
    }
  }

  async completeLesson(req, res, next) {
    try {
      const { courseId, lessonId } = req.params;
      const result = await courseService.completeLesson(
        courseId,
        lessonId,
        req.user
      );

      const message = result.courseCompleted
        ? "Kurs tugallandi! 🎓"
        : "Dars tugallandi! 🎉";

      sendSuccess(res, {
        message,
        completedCount: result.completedCount,
        courseCompleted: result.courseCompleted,
        nextLesson: result.nextLesson,
      });
    } catch (err) {
      if (err.message.includes("Pro")) {
        return sendError(res, err.message, 403);
      }
      if (err.message.includes("topilmadi")) {
        return sendError(res, err.message, 404);
      }
      next(err);
    }
  }
}

module.exports = new CourseController();
