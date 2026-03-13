const express = require("express");
const router  = express.Router();
const { protect, adminOnly } = require("../middleware/auth");
const {
  getDashboard,
  getUsers, getUser, togglePro, toggleActive, makeAdmin, deleteUser, bulkGrantPro,
  getCourses, getCourse, createCourse, updateCourse, deleteCourse, togglePublishCourse,
  getLessons, getLesson, createLesson, updateLesson, deleteLesson, togglePublishLesson,
} = require("../controllers/adminController");

/* Barcha admin route'lar himoyalangan */
router.use(protect, adminOnly);

/* ── Dashboard ── */
router.get("/dashboard", getDashboard);

/* ── Foydalanuvchilar ── */
router.get   ("/users",               getUsers);
router.get   ("/users/:id",           getUser);
router.put   ("/users/:id/pro",       togglePro);
router.put   ("/users/:id/toggle-active", toggleActive);
router.put   ("/users/:id/make-admin",    makeAdmin);
router.delete("/users/:id",           deleteUser);
router.post  ("/users/bulk-pro",      bulkGrantPro);

/* ── Kurslar ── */
router.get   ("/courses",             getCourses);
router.get   ("/courses/:id",         getCourse);
router.post  ("/courses",             createCourse);
router.put   ("/courses/:id",         updateCourse);
router.delete("/courses/:id",         deleteCourse);
router.patch ("/courses/:id/publish", togglePublishCourse);

/* ── Darslar ── */
router.get   ("/lessons",             getLessons);
router.get   ("/lessons/:id",         getLesson);
router.post  ("/lessons",             createLesson);
router.put   ("/lessons/:id",         updateLesson);
router.delete("/lessons/:id",         deleteLesson);
router.patch ("/lessons/:id/publish", togglePublishLesson);

module.exports = router;
