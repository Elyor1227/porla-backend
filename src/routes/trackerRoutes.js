/**
 * Tracker Routes
 */

const express = require("express");
const trackerController = require("../controllers/trackerController");
const { protect } = require("../middlewares/auth");

const router = express.Router();

router.get("/today", protect, (req, res, next) =>
  trackerController.getTodayData(req, res, next)
);

router.get("/cycles", protect, (req, res, next) =>
  trackerController.getAllCycles(req, res, next)
);

router.post("/cycles", protect, (req, res, next) =>
  trackerController.createCycle(req, res, next)
);

router.patch("/cycles/:id", protect, (req, res, next) =>
  trackerController.updateCycle(req, res, next)
);

router.post("/symptoms", protect, (req, res, next) =>
  trackerController.addOrUpdateSymptoms(req, res, next)
);

module.exports = router;
