/**
 * Admin Controller
 */

const adminService = require("../services/adminService");
const courseAdminService = require("../services/courseAdminService");
const { sendSuccess, sendError } = require("../utils/response");

class AdminController {
  async getStats(req, res, next) {
    try {
      const stats = await adminService.getStats();
      sendSuccess(res, { stats });
    } catch (err) {
      next(err);
    }
  }

  async createAdminUser(req, res, next) {
    try {
      const { name, email, password } = req.body;
      const user = await adminService.createAdminUser(name, email, password);
      sendSuccess(
        res,
        {
          message: "Yangi admin yaratildi",
          user: user.toPublicJSON(),
        },
        201
      );
    } catch (err) {
      if (
        err.message.includes("talab qilinadi") ||
        err.message.includes("kamida 6")
      ) {
        return sendError(res, err.message, 400);
      }
      if (err.message.includes("allaqachon")) {
        return sendError(res, err.message, 409);
      }
      next(err);
    }
  }

  async getUsers(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const search = req.query.search || "";
      const filter = req.query.filter || "all";

      const result = await adminService.getUsers(page, limit, search, filter);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async getUserById(req, res, next) {
    try {
      const { id } = req.params;
      const result = await adminService.getUserById(id);
      sendSuccess(res, result);
    } catch (err) {
      if (err.message.includes("topilmadi")) {
        return sendError(res, err.message, 404);
      }
      next(err);
    }
  }

  async setPro(req, res, next) {
    try {
      const { id } = req.params;
      const { isPro, months } = req.body;
      const user = await adminService.setPro(id, isPro, months || 1);
      const message = isPro
        ? `Pro ${months || 1} oyga berildi`
        : "Pro o'chirildi";
      sendSuccess(res, {
        message,
        user: user.toPublicJSON(),
      });
    } catch (err) {
      if (err.message.includes("topilmadi")) {
        return sendError(res, err.message, 404);
      }
      next(err);
    }
  }

  async blockUser(req, res, next) {
    try {
      const { id } = req.params;
      const { isBlocked } = req.body;
      const user = await adminService.blockUser(id, isBlocked);
      const message = isBlocked ? "Bloklandi" : "Blokdan chiqarildi";
      sendSuccess(res, {
        message,
        user,
      });
    } catch (err) {
      if (err.message.includes("topilmadi")) {
        return sendError(res, err.message, 404);
      }
      next(err);
    }
  }

  async deleteUser(req, res, next) {
    try {
      const { id } = req.params;
      await adminService.deleteUser(id);
      sendSuccess(res, { message: "Foydalanuvchi o'chirildi" });
    } catch (err) {
      if (err.message.includes("topilmadi")) {
        return sendError(res, err.message, 404);
      }
      if (err.message.includes("Admin")) {
        return sendError(res, err.message, 403);
      }
      next(err);
    }
  }

  async notifyUser(req, res, next) {
    try {
      const { id } = req.params;
      const { title, message, type } = req.body;
      await adminService.notifyUser(id, title, message, type);
      sendSuccess(res, { message: "Bildirishnoma yuborildi" });
    } catch (err) {
      if (err.message.includes("kerak")) {
        return sendError(res, err.message, 400);
      }
      next(err);
    }
  }

  async broadcastNotification(req, res, next) {
    try {
      const { title, message, type, onlyPro } = req.body;
      const result = await adminService.broadcastNotification(
        title,
        message,
        type,
        onlyPro
      );
      sendSuccess(res, {
        message: `${result.length} ta foydalanuvchiga yuborildi`,
      });
    } catch (err) {
      if (err.message.includes("kerak")) {
        return sendError(res, err.message, 400);
      }
      next(err);
    }
  }

  // Courses
  async getAllCourses(req, res, next) {
    try {
      const courses = await courseAdminService.getAllCourses();
      sendSuccess(res, { courses });
    } catch (err) {
      next(err);
    }
  }

  async createCourse(req, res, next) {
    try {
      const { title, description, icon, color, bgColor, isPro, order } =
        req.body;
      const course = await courseAdminService.createCourse(
        title,
        description,
        icon,
        color,
        bgColor,
        isPro,
        order
      );
      sendSuccess(
        res,
        {
          message: "Kurs qo'shildi",
          course,
        },
        201
      );
    } catch (err) {
      if (err.message.includes("majburiy")) {
        return sendError(res, err.message, 400);
      }
      next(err);
    }
  }

  async updateCourse(req, res, next) {
    try {
      const { id } = req.params;
      const course = await courseAdminService.updateCourse(id, req.body);
      sendSuccess(res, {
        message: "Kurs yangilandi",
        course,
      });
    } catch (err) {
      if (err.message.includes("topilmadi")) {
        return sendError(res, err.message, 404);
      }
      next(err);
    }
  }

  async deleteCourse(req, res, next) {
    try {
      const { id } = req.params;
      await courseAdminService.deleteCourse(id);
      sendSuccess(res, { message: "Kurs va darslari o'chirildi" });
    } catch (err) {
      if (err.message.includes("topilmadi")) {
        return sendError(res, err.message, 404);
      }
      next(err);
    }
  }

  // Lessons
  async getLessons(req, res, next) {
    try {
      const { courseId } = req.params;
      const lessons = await courseAdminService.getLessons(courseId);
      sendSuccess(res, { lessons });
    } catch (err) {
      next(err);
    }
  }

  async createLesson(req, res, next) {
    try {
      const { courseId } = req.params;
      const { title, content, videoUrl, order, isPro } = req.body;
      const duration = parseInt(req.body.duration, 10);
      const lesson = await courseAdminService.createLesson(
        courseId,
        title,
        content,
        videoUrl,
        Number.isFinite(duration) ? duration : 0,
        order,
        isPro,
        req.file?.filename
      );
      sendSuccess(
        res,
        {
          message: "Dars qo'shildi",
          lesson,
        },
        201
      );
    } catch (err) {
      if (err.message.includes("majburiy")) {
        return sendError(res, err.message, 400);
      }
      if (err.message.includes("topilmadi")) {
        return sendError(res, err.message, 404);
      }
      if (err.message.includes("video fayllar")) {
        return sendError(res, err.message, 400);
      }
      next(err);
    }
  }

  async updateLesson(req, res, next) {
    try {
      const { courseId, id } = req.params;
      const body = { ...req.body };
      delete body.videoFile;
      if (body.duration !== undefined) {
        const d = parseInt(body.duration, 10);
        body.duration = Number.isFinite(d) ? d : 0;
      }
      if (req.file) {
        body.videoFile = req.file.filename;
        body.videoUrl = "";
      }
      const lesson = await courseAdminService.updateLesson(courseId, id, body);
      sendSuccess(res, {
        message: "Dars yangilandi",
        lesson,
      });
    } catch (err) {
      if (err.message.includes("topilmadi")) {
        return sendError(res, err.message, 404);
      }
      if (err.message.includes("video fayllar")) {
        return sendError(res, err.message, 400);
      }
      next(err);
    }
  }

  async deleteLesson(req, res, next) {
    try {
      const { courseId, id } = req.params;
      await courseAdminService.deleteLesson(courseId, id);
      sendSuccess(res, { message: "Dars o'chirildi" });
    } catch (err) {
      if (err.message.includes("topilmadi")) {
        return sendError(res, err.message, 404);
      }
      next(err);
    }
  }

  async seedData(req, res, next) {
    try {
      const result = await courseAdminService.seedData();
      sendSuccess(res, {
        message: "Seed data qo'shildi",
        courses: result.courses,
        lessons: result.lessons,
      });
    } catch (err) {
      if (err.message.includes("allaqon")) {
        return sendSuccess(res, { message: "Ma'lumotlar allaqon mavjud" });
      }
      next(err);
    }
  }
}

module.exports = new AdminController();
