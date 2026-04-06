/**
 * Admin Service
 */

const User = require("../models/User");
const Course = require("../models/Course");
const Lesson = require("../models/Lesson");
const Cycle = require("../models/Cycle");
const Notification = require("../models/Notification");
const { MESSAGES } = require("../config/constants");

class AdminService {
  async getStats() {
    const [totalUsers, proUsers, totalCourses, totalLessons, newUsersToday, newUsersThisWeek, newUsersThisMonth, totalCycles] =
      await Promise.all([
        User.countDocuments(),
        User.countDocuments({ isPro: true }),
        Course.countDocuments({ isActive: true }),
        Lesson.countDocuments({ isActive: true }),
        User.countDocuments({
          createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        }),
        User.countDocuments({
          createdAt: { $gte: new Date(Date.now() - 7 * 86400000) },
        }),
        User.countDocuments({
          createdAt: { $gte: new Date(Date.now() - 30 * 86400000) },
        }),
        Cycle.countDocuments(),
      ]);

    // Pro expiring soon
    const expiringProUsers = await User.countDocuments({
      isPro: true,
      proExpiresAt: {
        $gte: new Date(),
        $lte: new Date(Date.now() + 7 * 86400000),
      },
    });

    // Last 7 days user growth
    const last7days = await Promise.all(
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const start = new Date(d.setHours(0, 0, 0, 0));
        const end = new Date(d.setHours(23, 59, 59, 999));

        return User.countDocuments({
          createdAt: { $gte: start, $lte: end },
        }).then((count) => ({
          date: start.toLocaleDateString("uz-UZ", {
            month: "short",
            day: "numeric",
          }),
          count,
        }));
      })
    );

    return {
      totalUsers,
      proUsers,
      freeUsers: totalUsers - proUsers,
      totalCourses,
      totalLessons,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
      totalCycles,
      last7days,
      proPercentage:
        totalUsers > 0
          ? Math.round((proUsers / totalUsers) * 100)
          : 0,
      expiringProUsers,
    };
  }

  async getUsers(page, limit, search, filter) {
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    if (filter === "pro") {
      query.isPro = true;
    } else if (filter === "free") {
      query.isPro = false;
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      User.countDocuments(query),
    ]);

    // Enrich with pro expiry info
    const now = new Date();
    const enriched = users.map((u) => {
      const obj = u.toObject();
      if (obj.isPro && obj.proExpiresAt) {
        const msLeft = new Date(obj.proExpiresAt) - now;
        obj.proDaysLeft = Math.max(0, Math.ceil(msLeft / 86400000));
        obj.proExpired = msLeft < 0;
      }
      return obj;
    });

    return {
      users: enriched,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async getUserById(id) {
    const user = await User.findById(id).select("-password");

    if (!user) {
      throw new Error(MESSAGES.USER_NOT_FOUND);
    }

    const cycles = await Cycle.find({ userId: user._id })
      .sort({ startDate: -1 })
      .limit(5);

    // Pro expiry info
    const obj = user.toObject();
    if (obj.isPro && obj.proExpiresAt) {
      const msLeft = new Date(obj.proExpiresAt) - new Date();
      obj.proDaysLeft = Math.max(0, Math.ceil(msLeft / 86400000));
      obj.proExpired = msLeft < 0;
    }

    return { user: obj, cycles };
  }

  async setPro(userId, isPro, months = 1) {
    const user = await User.findById(userId);

    if (!user) {
      throw new Error(MESSAGES.USER_NOT_FOUND);
    }

    user.isPro = isPro;

    if (isPro) {
      const exp = new Date();
      exp.setMonth(exp.getMonth() + months);
      user.proExpiresAt = exp;
    } else {
      user.proExpiresAt = null;
    }

    await user.save({ validateBeforeSave: false });

    // Create notification
    await Notification.create({
      userId: user._id,
      title: isPro ? "Pro rejim faollashtirildi! ✦" : "Pro rejim o'chirildi",
      message: isPro
        ? `Tabriklaymiz! Sizga ${months} oylik Pro rejim berildi.`
        : "Pro rejiminiz o'chirildi. Bepul kurslar bilan davom etishingiz mumkin.",
      type: isPro ? "achievement" : "info",
    });

    return user;
  }

  async blockUser(userId, isBlocked) {
    const user = await User.findByIdAndUpdate(
      userId,
      { isBlocked },
      { returnDocument: "after" }
    ).select("-password");

    if (!user) {
      throw new Error(MESSAGES.USER_NOT_FOUND);
    }

    return user;
  }

  async deleteUser(userId) {
    const user = await User.findById(userId);

    if (!user) {
      throw new Error(MESSAGES.USER_NOT_FOUND);
    }

    if (user.isAdmin) {
      throw new Error(MESSAGES.CANNOT_DELETE_ADMIN);
    }

    await Promise.all([
      User.findByIdAndDelete(userId),
      Cycle.deleteMany({ userId }),
      Notification.deleteMany({ userId }),
    ]);

    return user;
  }

  async notifyUser(userId, title, message, type = "info") {
    if (!title || !message) {
      throw new Error("Sarlavha va xabar kerak");
    }

    return await Notification.create({
      userId,
      title,
      message,
      type,
    });
  }

  async broadcastNotification(title, message, type = "info", onlyPro = false) {
    if (!title || !message) {
      throw new Error("Sarlavha va xabar kerak");
    }

    const users = await User.find(
      onlyPro ? { isPro: true } : {}
    ).select("_id");

    return await Notification.insertMany(
      users.map((u) => ({
        userId: u._id,
        title,
        message,
        type,
      }))
    );
  }

  /** Mavjud admin tomonidan yangi admin yaratish */
  async createAdminUser(name, email, password) {
    if (!name || !email || !password) {
      throw new Error("Ism, email va parol talab qilinadi");
    }
    if (password.length < 6) {
      throw new Error(MESSAGES.PASSWORD_MIN);
    }

    const normalized = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalized });
    if (existing) {
      throw new Error(MESSAGES.EMAIL_EXISTS);
    }

    return User.create({
      name,
      email: normalized,
      password,
      isAdmin: true,
      isPro: true,
    });
  }
}

module.exports = new AdminService();
