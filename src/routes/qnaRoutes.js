// Admin: delete all Q&A and notifications
// Authenticated user: get their own answers (no contact needed)

// Public: submit anonymous question
/**
 * Q&A Routes
*/

const express = require("express");
const qnaController = require("../controllers/qnaController");
const { protect, requireAdmin } = require("../middlewares/auth");

const router = express.Router();


// Admin routes
router.delete("/admin/clear-all", protect, requireAdmin, (req, res, next) => qnaController.clearAllQnaAndNotifications(req, res, next));
router.post("/admin/notify-all", protect, requireAdmin, (req, res, next) =>
  qnaController.notifyAllUsers(req, res, next)
);
router.get("/answers", protect, (req, res, next) => qnaController.getUserAnswers(req, res, next));
router.post("/questions", (req, res, next) => qnaController.submitQuestion(req, res, next));
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

// Anonymous: automatically get all answers by contact (no manual check needed)
router.get("/anon/answers", (req, res, next) => qnaController.getAnonAnswer(req, res, next));


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
