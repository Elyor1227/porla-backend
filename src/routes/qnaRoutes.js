/**
 * Q&A Routes
 */

const express = require("express");
const rateLimit = require("express-rate-limit");
const qnaController = require("../controllers/qnaController");
const { protect, requireAdmin } = require("../middlewares/auth");
const { RATE_LIMIT } = require("../config/constants");

const router = express.Router();

// Savol yuborishga alohida (qattiqroq) limiter
const qnaSubmitLimiter = rateLimit({
  windowMs: RATE_LIMIT.qnaSubmit.windowMs,
  max: RATE_LIMIT.qnaSubmit.max,
  message: {
    success: false,
    message: "Juda tez-tez yuborilmoqda. 15 daqiqadan keyin qayta urinib ko'ring.",
  },
});

// ── Public ──
// Anonim yoki autentifikatsiyalangan savol yuborish
router.post("/questions", qnaSubmitLimiter, (req, res, next) =>
  qnaController.submitQuestion(req, res, next)
);
// Anonim foydalanuvchi javobni kontakt orqali tekshiradi
router.get("/anon/answers", (req, res, next) =>
  qnaController.getAnonAnswer(req, res, next)
);

// ── Authenticated user ──
router.get("/answers", protect, (req, res, next) =>
  qnaController.getUserAnswers(req, res, next)
);

// ── Admin ──
router.delete("/admin/clear-all", protect, requireAdmin, (req, res, next) =>
  qnaController.clearAllQnaAndNotifications(req, res, next)
);
router.post("/admin/notify-all", protect, requireAdmin, (req, res, next) =>
  qnaController.notifyAllUsers(req, res, next)
);
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
