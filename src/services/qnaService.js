/**
 * Q&A Service
 */

const Qna = require("../models/Qna");
const Notification = require("../models/Notification");

class QnAService {
  async submitQuestion(question, topic, askedName, contact, askedIp) {
    if (!question || typeof question !== "string" || question.trim().length < 5) {
      throw new Error("Savol kamina 5 ta belgi bo'lishi kerak");
    }

    const doc = await Qna.create({
      question: question.trim(),
      topic: topic?.trim() || "",
      askedName: askedName?.trim() || "",
      contact: contact?.trim() || "",
      askedIp: askedIp || "",
    });

    return doc;
  }

  async getPublicQuestions(page, limit, search, topic) {
    const query = { isPublished: true, status: "answered" };

    if (search) {
      query.question = { $regex: search, $options: "i" };
    }
    if (topic) {
      query.topic = { $regex: `^${topic}$`, $options: "i" };
    }

    const [items, total] = await Promise.all([
      Qna.find(query)
        .sort({ answeredAt: -1, updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select("question answer topic answeredAt updatedAt"),
      Qna.countDocuments(query),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getPublicQuestionById(id) {
    const item = await Qna.findOne({
      _id: id,
      isPublished: true,
      status: "answered",
    }).select("question answer topic answeredAt updatedAt");

    if (!item) {
      throw new Error("Savol topilmadi yoki hali nashr etilmagan");
    }

    return item;
  }

  async getAdminQuestions(page, limit, status, published, search) {
    const query = {};

    if (status === "pending" || status === "answered") {
      query.status = status;
    }
    if (published === "true") {
      query.isPublished = true;
    } else if (published === "false") {
      query.isPublished = false;
    }
    if (search) {
      query.question = { $regex: search, $options: "i" };
    }

    const [items, total] = await Promise.all([
      Qna.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("askedBy", "name email")
        .populate("answeredBy", "name email"),
      Qna.countDocuments(query),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getAdminQuestionById(id) {
    const item = await Qna.findById(id)
      .populate("askedBy", "name email")
      .populate("answeredBy", "name email");

    if (!item) {
      throw new Error("Savol topilmadi");
    }

    return item;
  }

  async answerQuestion(id, answer, isPublished, answeredBy) {
    if (!answer || answer.trim().length < 3) {
      throw new Error("Javob kamina 3 ta belgi bo'lishi kerak");
    }

    const item = await Qna.findById(id);
    if (!item) {
      throw new Error("Savol topilmadi");
    }

    item.answer = answer.trim();
    item.status = "answered";
    item.answeredBy = answeredBy;
    item.answeredAt = new Date();

    if (typeof isPublished === "boolean") {
      item.isPublished = isPublished;
    }

    await item.save();

    // Notify user if they asked the question
    if (item.askedBy) {
      await Notification.create({
        userId: item.askedBy,
        title: "Savolingizga javob berildi",
        message: `Savolingizga javob tayyor. Mavzu: ${item.topic || "Umumiy"}.`,
        type: "info",
      }).catch(() => {});
    }

    return item;
  }

  async publishQuestion(id, isPublished) {
    if (typeof isPublished !== "boolean") {
      throw new Error("isPublished boolean bo'lishi kerak");
    }

    const item = await Qna.findByIdAndUpdate(
      id,
      { isPublished },
      { returnDocument: "after" }
    );

    if (!item) {
      throw new Error("Savol topilmadi");
    }

    return item;
  }

  async deleteQuestion(id) {
    const item = await Qna.findByIdAndDelete(id);

    if (!item) {
      throw new Error("Savol topilmadi");
    }

    return item;
  }
}

module.exports = new QnAService();
