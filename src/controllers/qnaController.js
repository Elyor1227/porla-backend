
/**
 * Q&A Controller
 */
const qnaService = require("../services/qnaService");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { sendSuccess, sendError } = require("../utils/response");

class QnAController {
  // Admin: delete all Q&A and notifications
  async clearAllQnaAndNotifications(req, res, next) {
    try {
      await qnaService.clearAllQnaAndNotifications();
      sendSuccess(res, { message: "Barcha savol-javoblar va notificationlar o'chirildi" });
    } catch (err) {
      next(err);
    }
  }
  // Authenticated user: get their own answers
  async getUserAnswers(req, res, next) {
    try {
      const userId = req.user && req.user._id;
      if (!userId) return sendError(res, "Foydalanuvchi aniqlanmadi", 401);
      const items = await qnaService.getAnswersByUserId(userId);
      sendSuccess(res, { items });
    } catch (err) {
      next(err);
    }
  }
  // Anonymous user checks answer by contact (email/phone)
  async getAnonAnswer(req, res, next) {
    try {
      const contact = (req.query.contact || "").trim();
      if (!contact) {
        return sendError(res, "Kontakt (email yoki telefon) kerak", 400);
      }
      const items = await qnaService.getAnonAnswersByContact(contact);
      sendSuccess(res, { items });
    } catch (err) {
      next(err);
    }
  }

  // ...existing controller methods...
  async submitQuestion(req, res, next) {
    try {
      const { question, topic, askedName, contact } = req.body;
      const askedIp = req.headers["x-forwarded-for"] || req.ip || "";

      // If user is authenticated, use their _id and email
      let askedBy = null;
      let finalContact = contact;
      if (req.user) {
        askedBy = req.user._id;
        if (req.user.email) finalContact = req.user.email;
      }

      const doc = await qnaService.submitQuestion(
        question,
        topic,
        askedName,
        finalContact,
        askedIp.toString(),
        askedBy
      );

      sendSuccess(
        res,
        {
          message:
            "Savolingiz yuborildi! Adminlar tez orada ko'rib chiqadi.",
          id: doc._id,
        },
        201
      );
    } catch (err) {
      if (err.message.includes("belgi")) {
        return sendError(res, err.message, 400);
      }
      next(err);
    }
  }

  async getPublicQuestions(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 20, 50);
      const search = (req.query.search || "").trim();
      const topic = (req.query.topic || "").trim();

      const result = await qnaService.getPublicQuestions(
        page,
        limit,
        search,
        topic
      );
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async getPublicQuestionById(req, res, next) {
    try {
      const { id } = req.params;
      const item = await qnaService.getPublicQuestionById(id);
      sendSuccess(res, { item });
    } catch (err) {
      if (err.message.includes("topilmadi")) {
        return sendError(res, err.message, 404);
      }
      next(err);
    }
  }

  async getAdminQuestions(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const status = (req.query.status || "").trim();
      const published = (req.query.published || "").trim();
      const search = (req.query.search || "").trim();

      const result = await qnaService.getAdminQuestions(
        page,
        limit,
        status,
        published,
        search
      );
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async getAdminQuestionById(req, res, next) {
    try {
      const { id } = req.params;
      const item = await qnaService.getAdminQuestionById(id);
      sendSuccess(res, { item });
    } catch (err) {
      if (err.message.includes("topilmadi")) {
        return sendError(res, err.message, 404);
      }
      next(err);
    }
  }

  async answerQuestion(req, res, next) {
    try {
      const { id } = req.params;
      const { answer, isPublished } = req.body;
      const item = await qnaService.answerQuestion(
        id,
        answer,
        isPublished,
        req.user._id
      );
      sendSuccess(res, {
        message: "Javob saqlandi",
        item,
      });
    } catch (err) {
      if (err.message.includes("belgi")) {
        return sendError(res, err.message, 400);
      }
      if (err.message.includes("topilmadi")) {
        return sendError(res, err.message, 404);
      }
      next(err);
    }
  }

  async publishQuestion(req, res, next) {
    try {
      const { id } = req.params;
      const { isPublished } = req.body;
      const item = await qnaService.publishQuestion(id, isPublished);
      const message = isPublished ? "Nashr etildi" : "Nashrdan olindi";
      sendSuccess(res, {
        message,
        item,
      });
    } catch (err) {
      if (err.message.includes("topilmadi")) {
        return sendError(res, err.message, 404);
      }
      next(err);
    }
  }

  async deleteQuestion(req, res, next) {
    try {
      const { id } = req.params;
      await qnaService.deleteQuestion(id);
      sendSuccess(res, { message: "Savol o'chirildi" });
    } catch (err) {
      if (err.message.includes("topilmadi")) {
        return sendError(res, err.message, 404);
      }
      next(err);
    }
  }
  async notifyAllUsers(req, res) {
  const { type, title, message } = req.body;
  // Barcha userlarni toping va notification yarating
  const users = await User.find({});
  const notifications = users.map(u => ({
    user: u._id,
    type,
    title,
    message,
    createdAt: new Date(),
    isRead: false,
  }));
  await Notification.insertMany(notifications);
  res.json({ success: true, message: "Broadcast yuborildi" });
}
};

module.exports = new QnAController();
