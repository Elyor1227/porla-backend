/**
 * Admin Routes
 */

const express = require("express");
const adminController = require("../controllers/adminController");
const { protect, requireAdmin } = require("../middlewares/auth");
const User = require("../models/User");
const { ADMIN_KEY, MESSAGES } = require("../config/constants");

const router = express.Router();

// Create admin (one-time)
router.post("/create-admin", async (req, res) => {
  try {
    const key = req.headers["x-admin-key"];
    if (key !== ADMIN_KEY) {
      return res.status(403).json({ success: false, message: "Ruxsat yo'q" });
    }

    if (await User.findOne({ isAdmin: true })) {
      return res.status(409).json({
        success: false,
        message: MESSAGES.ADMIN_ALREADY_EXISTS,
      });
    }

    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Ism, email va parol talab qilinadi",
      });
    }

    const admin = await User.create({
      name,
      email,
      password,
      isAdmin: true,
      isPro: true,
    });

    return res.status(201).json({
      success: true,
      message: MESSAGES.ADMIN_CREATED,
      user: admin.toPublicJSON(),
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: err.message });
  }
});

// All admin routes require auth and admin role
router.use(protect, requireAdmin);

// Stats
router.get("/stats", (req, res, next) =>
  adminController.getStats(req, res, next)
);

// Users
router.get("/users", (req, res, next) =>
  adminController.getUsers(req, res, next)
);

router.get("/users/:id", (req, res, next) =>
  adminController.getUserById(req, res, next)
);

router.patch("/users/:id/pro", (req, res, next) =>
  adminController.setPro(req, res, next)
);

router.patch("/users/:id/block", (req, res, next) =>
  adminController.blockUser(req, res, next)
);

router.delete("/users/:id", (req, res, next) =>
  adminController.deleteUser(req, res, next)
);

router.post("/users/:id/notify", (req, res, next) =>
  adminController.notifyUser(req, res, next)
);

router.post("/broadcast", (req, res, next) =>
  adminController.broadcastNotification(req, res, next)
);

// Courses
router.get("/courses", (req, res, next) =>
  adminController.getAllCourses(req, res, next)
);

router.post("/courses", (req, res, next) =>
  adminController.createCourse(req, res, next)
);

router.patch("/courses/:id", (req, res, next) =>
  adminController.updateCourse(req, res, next)
);

router.delete("/courses/:id", (req, res, next) =>
  adminController.deleteCourse(req, res, next)
);

// Lessons
router.get("/courses/:courseId/lessons", (req, res, next) =>
  adminController.getLessons(req, res, next)
);

router.post("/courses/:courseId/lessons", (req, res, next) =>
  adminController.createLesson(req, res, next)
);

router.patch("/courses/:courseId/lessons/:id", (req, res, next) =>
  adminController.updateLesson(req, res, next)
);

router.delete("/courses/:courseId/lessons/:id", (req, res, next) =>
  adminController.deleteLesson(req, res, next)
);

// Seed
router.post("/seed", (req, res, next) =>
  adminController.seedData(req, res, next)
);

module.exports = router;
