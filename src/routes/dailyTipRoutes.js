/**
 * Daily Tip Routes
 */

const express = require("express");
const dailyTipController = require("../controllers/dailyTipController");
const { protect, requireAdmin } = require("../middlewares/auth");

const router = express.Router();

// Public routes
router.get("/today", (req, res, next) =>
  dailyTipController.getTodayTip(req, res, next)
);

router.get("/", (req, res, next) =>
  dailyTipController.getAllTips(req, res, next)
);

// Admin routes
router.get("/admin/tips", protect, requireAdmin, (req, res, next) =>
  dailyTipController.getAllTipsAdmin(req, res, next)
);

router.post("/admin/tips", protect, requireAdmin, (req, res, next) =>
  dailyTipController.createTip(req, res, next)
);

router.patch("/admin/tips/:id", protect, requireAdmin, (req, res, next) =>
  dailyTipController.updateTip(req, res, next)
);

router.delete("/admin/tips/:id", protect, requireAdmin, (req, res, next) =>
  dailyTipController.deleteTip(req, res, next)
);

module.exports = router;
