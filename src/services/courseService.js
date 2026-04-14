/**
 * Course Service
 * Business logic for course operations
 */

const fs = require("fs");
const path = require("path");
const Course = require("../models/Course");
const Lesson = require("../models/Lesson");
const { MESSAGES } = require("../config/constants");
const { toClientVideoUrl } = require("../utils/lessonVideo");
const { getVideoPath } = require("../utils/videoUpload");

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
      const isLocked =
        course.isPro && idx > 0 && !isUserPro;
      const { videoFile: _vf, ...rest } = obj;

      return {
        ...rest,
        isCompleted,
        isLocked,
        content: isLocked ? "" : obj.content,
        videoUrl: isLocked
          ? ""
          : toClientVideoUrl(obj, course._id.toString()),
      };
    });

    return { course, lessons: withProgress };
  }

  async getLessonById(courseId, lessonId, user) {
    const course = await Course.findById(courseId);
    if (!course) {
      throw new Error(MESSAGES.COURSE_NOT_FOUND);
    }

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

    // Pro kurs: 1-dars bepul; qolganlari Pro kerak. Bepul kursda barcha darslar ochiq.
    if (course.isPro && idx > 0 && !isUserPro) {
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
          isLocked: course.isPro && idx + 1 > 0 && !isUserPro,
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

    const lo = lesson.toObject();
    const { videoFile: _vf, ...lessonRest } = lo;

    return {
      lesson: {
        ...lessonRest,
        isCompleted,
        videoUrl: toClientVideoUrl(lo, courseId),
      },
      navigation: {
        current: idx + 1,
        total: allLessons.length,
        prevLesson,
        nextLesson,
      },
    };
  }

  async assertLessonVideoAccess(courseId, lessonId, user) {
    const course = await Course.findById(courseId);
    if (!course) {
      const err = new Error(MESSAGES.COURSE_NOT_FOUND);
      err.statusCode = 404;
      throw err;
    }

    const lesson = await Lesson.findOne({
      _id: lessonId,
      courseId: courseId,
      isActive: true,
    });

    if (!lesson) {
      const err = new Error(MESSAGES.LESSON_NOT_FOUND);
      err.statusCode = 404;
      throw err;
    }

    const allLessons = await Lesson.find({
      courseId: courseId,
      isActive: true,
    }).sort("order");

    const idx = allLessons.findIndex(
      (l) => l._id.toString() === lesson._id.toString()
    );
    const isUserPro = user.isPro || user.isAdmin;

    if (course.isPro && idx > 0 && !isUserPro) {
      const error = new Error(MESSAGES.COURSE_LOCKED);
      error.isPro = true;
      error.statusCode = 403;
      throw error;
    }

    return lesson;
  }

  getMimeForVideo(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const map = {
      ".mp4": "video/mp4",
      ".webm": "video/webm",
      ".mov": "video/quicktime",
      ".m4v": "video/x-m4v",
    };
    return map[ext] || "application/octet-stream";
  }

  /**
   * Himoyalangan video oqimi (Range qo'llab-quvvatlash, inline yoki ?download=1)
   */
  async sendLessonVideo(req, res) {
    const { courseId, lessonId } = req.params;
    const lesson = await this.assertLessonVideoAccess(courseId, lessonId, req.user);

    if (!lesson.videoFile) {
      const err = new Error("Bu dars uchun yuklangan video fayl yo'q");
      err.statusCode = 404;
      throw err;
    }

    const filePath = getVideoPath(lesson.videoFile);
    if (!filePath || !fs.existsSync(filePath)) {
      const err = new Error("Video fayl serverda topilmadi");
      err.statusCode = 404;
      throw err;
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const mime = this.getMimeForVideo(filePath);
    const download =
      req.query.download === "1" || req.query.download === "true";
    const baseName =
      lesson.title.replace(/[^\w\s.-]/g, "_").slice(0, 80) +
      path.extname(filePath);
    const disposition = download
      ? `attachment; filename*=UTF-8''${encodeURIComponent(baseName)}`
      : `inline; filename*=UTF-8''${encodeURIComponent(baseName)}`;

    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      let start = parseInt(parts[0], 10);
      let end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      if (Number.isNaN(start)) start = 0;
      if (Number.isNaN(end)) end = fileSize - 1;
      if (start >= fileSize || start > end) {
        res.status(416);
        res.set("Content-Range", `bytes */${fileSize}`);
        return res.end();
      }
      if (end >= fileSize) end = fileSize - 1;
      const chunksize = end - start + 1;
      const stream = fs.createReadStream(filePath, { start, end });
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize,
        "Content-Type": mime,
        "Content-Disposition": disposition,
        "Cache-Control": "private, max-age=3600",
      });
      stream.pipe(res);
      stream.on("error", () => {
        if (!res.headersSent) res.status(500).end();
      });
    } else {
      res.writeHead(200, {
        "Content-Length": fileSize,
        "Content-Type": mime,
        "Accept-Ranges": "bytes",
        "Content-Disposition": disposition,
        "Cache-Control": "private, max-age=3600",
      });
      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
      stream.on("error", () => {
        if (!res.headersSent) res.status(500).end();
      });
    }
  }

  async completeLesson(courseId, lessonId, user) {
    const course = await Course.findById(courseId);
    if (!course) {
      throw new Error(MESSAGES.COURSE_NOT_FOUND);
    }

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

    if (course.isPro && idx > 0 && !isUserPro) {
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
          isLocked: course.isPro && idx + 1 > 0 && !isUserPro,
          isCompleted: completedIds.includes(nextRaw._id.toString()),
        }
      : null;

    // Check if course is completed
    const courseCompleted = !nextRaw;

    if (courseCompleted && !already) {
      await Notification.create({
        userId: user._id,
        title: "🎓 Kurs tugallandi!",
        message: `Tabriklaymiz! Siz "${course.title}" kursini to'liq tugatdingiz.`,
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
