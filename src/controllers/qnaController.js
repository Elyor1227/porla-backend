/**
 * Q&A Controller
 */

const qnaService = require("../services/qnaService");
const { sendSuccess, sendError } = require("../utils/response");

class QnAController {
  async submitQuestion(req, res, next) {
    try {
      const { question, topic, askedName, contact } = req.body;
      const askedIp =
        req.headers["x-forwarded-for"] || req.ip || "";

      const doc = await qnaService.submitQuestion(
        question,
        topic,
        askedName,
        contact,
        askedIp.toString()
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
}

module.exports = new QnAController();
