/**
 * Course Controller
 */

const courseService = require("../services/courseService");
const { sendSuccess } = require("../utils/response");

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
      next(err);
    }
  }

  async getLessonById(req, res, next) {
    try {
      const { courseId, lessonId } = req.params;
      const result = await courseService.getLessonById(courseId, lessonId, req.user);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async streamLessonVideo(req, res, next) {
    try {
      await courseService.sendLessonVideo(req, res);
    } catch (err) {
      next(err);
    }
  }

  async completeLesson(req, res, next) {
    try {
      const { courseId, lessonId } = req.params;
      const result = await courseService.completeLesson(courseId, lessonId, req.user);

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
      next(err);
    }
  }
}

module.exports = new CourseController();
