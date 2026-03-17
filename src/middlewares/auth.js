/**
 * Authentication Middleware
 */

const jwt = require("jsonwebtoken");
const { JWT_SECRET, MESSAGES } = require("../config/constants");
const User = require("../models/User");
const Notification = require("../models/Notification");
const AppError = require("../utils/AppError");

const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: MESSAGES.AUTH_REQUIRED,
      });
    }

    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: MESSAGES.AUTH_REQUIRED,
      });
    }

    // Check if user is blocked
    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: MESSAGES.USER_BLOCKED,
      });
    }

    // Auto-disable expired Pro
    if (user.isPro && user.proExpiresAt && new Date(user.proExpiresAt) < new Date()) {
      user.isPro = false;
      user.proExpiresAt = null;
      await user.save({ validateBeforeSave: false });

      await Notification.create({
        userId: user._id,
        title: "Pro rejim muddati tugadi",
        message: "Pro rejiminiz muddati tugadi. Yangilash uchun profil bo'limiga o'ting.",
        type: "warning",
      }).catch(() => {});
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: MESSAGES.TOKEN_INVALID,
      });
    }
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: MESSAGES.TOKEN_EXPIRED,
      });
    }
    next(err);
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({
      success: false,
      message: MESSAGES.ADMIN_REQUIRED,
    });
  }
  next();
};

module.exports = {
  protect,
  requireAdmin,
};
