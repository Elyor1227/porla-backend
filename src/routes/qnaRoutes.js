/**
 * Q&A Routes
 */

const express = require("express");
const qnaController = require("../controllers/qnaController");
const { protect, requireAdmin } = require("../middlewares/auth");

const router = express.Router();

// Public routes
router.post("/questions", (req, res, next) =>
  qnaController.submitQuestion(req, res, next)
);

router.get("/public", (req, res, next) =>
  qnaController.getPublicQuestions(req, res, next)
);

router.get("/public/:id", (req, res, next) =>
  qnaController.getPublicQuestionById(req, res, next)
);

// Admin routes
router.get("/admin/questions", protect, requireAdmin, (req, res, next) =>
  qnaController.getAdminQuestions(req, res, next)
);

router.get("/admin/questions/:id", protect, requireAdmin, (req, res, next) =>
  qnaController.getAdminQuestionById(req, res, next)
);

router.patch("/admin/questions/:id/answer", protect, requireAdmin, (req, res, next) =>
  qnaController.answerQuestion(req, res, next)
);

router.patch("/admin/questions/:id/publish", protect, requireAdmin, (req, res, next) =>
  qnaController.publishQuestion(req, res, next)
);

router.delete("/admin/questions/:id", protect, requireAdmin, (req, res, next) =>
  qnaController.deleteQuestion(req, res, next)
);

module.exports = router;
