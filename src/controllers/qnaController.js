/**
 * Q&A Controller
 */
const qnaService = require("../services/qnaService");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { sendSuccess, sendError } = require("../utils/response");

class QnAController {
  // Admin: barcha Q&A va notificationlarni o'chirish
  async clearAllQnaAndNotifications(req, res, next) {
    try {
      await qnaService.clearAllQnaAndNotifications();
      sendSuccess(res, {
        message: "Barcha savol-javoblar va notificationlar o'chirildi",
      });
    } catch (err) {
      next(err);
    }
  }

  // Autentifikatsiyalangan foydalanuvchi o'z javoblarini oladi
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

  // Anonim foydalanuvchi kontakt (email/telefon) orqali javobni tekshiradi
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

  async submitQuestion(req, res, next) {
    try {
      const { question, topic, askedName, contact } = req.body;
      const askedIp = req.headers["x-forwarded-for"] || req.ip || "";

      // Autentifikatsiyalangan bo'lsa, _id va email ishlatiladi
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
          message: "Savolingiz yuborildi! Adminlar tez orada ko'rib chiqadi.",
          id: doc._id,
        },
        201
      );
    } catch (err) {
      next(err);
    }
  }

  async getPublicQuestions(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 20, 50);
      const search = (req.query.search || "").trim();
      const topic = (req.query.topic || "").trim();

      const result = await qnaService.getPublicQuestions(page, limit, search, topic);
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

      const result = await qnaService.getAdminQuestions(page, limit, status, published, search);
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
      next(err);
    }
  }

  async answerQuestion(req, res, next) {
    try {
      const { id } = req.params;
      const { answer, isPublished } = req.body;
      const item = await qnaService.answerQuestion(id, answer, isPublished, req.user._id);
      sendSuccess(res, { message: "Javob saqlandi", item });
    } catch (err) {
      next(err);
    }
  }

  async publishQuestion(req, res, next) {
    try {
      const { id } = req.params;
      const { isPublished } = req.body;
      const item = await qnaService.publishQuestion(id, isPublished);
      const message = isPublished ? "Nashr etildi" : "Nashrdan olindi";
      sendSuccess(res, { message, item });
    } catch (err) {
      next(err);
    }
  }

  async deleteQuestion(req, res, next) {
    try {
      const { id } = req.params;
      await qnaService.deleteQuestion(id);
      sendSuccess(res, { message: "Savol o'chirildi" });
    } catch (err) {
      next(err);
    }
  }

  async notifyAllUsers(req, res, next) {
    try {
      const { type = "info", title, message } = req.body;
      if (!title || !message) {
        return sendError(res, "Sarlavha va xabar kerak", 400);
      }
      const users = await User.find({}).select("_id");
      const notifications = users.map((u) => ({
        userId: u._id,
        type,
        title,
        message,
        isRead: false,
      }));
      await Notification.insertMany(notifications);
      sendSuccess(res, { message: `${users.length} ta foydalanuvchiga yuborildi` });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new QnAController();
