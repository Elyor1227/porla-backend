/**
 * Notification Routes
 */

const express = require("express");
const notificationController = require("../controllers/notificationController");
const { protect } = require("../middlewares/auth");

const router = express.Router();

router.get("/", protect, (req, res, next) =>
  notificationController.getNotifications(req, res, next)
);

router.patch("/:id/read", protect, (req, res, next) =>
  notificationController.markAsRead(req, res, next)
);

router.patch("/read-all", protect, (req, res, next) =>
  notificationController.markAllAsRead(req, res, next)
);

module.exports = router;
