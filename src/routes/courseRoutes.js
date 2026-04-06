/**
 * Course Routes
 */

const express = require("express");
const courseController = require("../controllers/courseController");
const { protect, protectVideo } = require("../middlewares/auth");

const router = express.Router();

router.get("/", protect, (req, res, next) =>
  courseController.getAllCourses(req, res, next)
);

router.get("/:courseId/lessons/:lessonId/video", protectVideo, (req, res, next) =>
  courseController.streamLessonVideo(req, res, next)
);

router.get("/:courseId/lessons/:lessonId", protect, (req, res, next) =>
  courseController.getLessonById(req, res, next)
);

router.post("/:courseId/lessons/:lessonId/complete", protect, (req, res, next) =>
  courseController.completeLesson(req, res, next)
);

router.get("/:id", protect, (req, res, next) =>
  courseController.getCourseById(req, res, next)
);

module.exports = router;
