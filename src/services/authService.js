/**
 * Authentication Service
 * Business logic for auth operations
 */

const User = require("../models/User");
const Notification = require("../models/Notification");
const { MESSAGES } = require("../config/constants");
const AppError = require("../utils/AppError");

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function normalizePhone(phone) {
  const raw = String(phone || "").trim();
  if (!raw) return "";
  const normalized = raw.replace(/[^\d+]/g, "");
  if (/^\+?\d{9,15}$/.test(normalized)) {
    return normalized.startsWith("+") ? normalized : `+${normalized}`;
  }
  return "";
}

function buildLoginQuery({ email, phone, login }) {
  const emailNorm = normalizeEmail(email);
  const phoneNorm = normalizePhone(phone);
  const loginRaw = String(login || "").trim();
  const loginEmail = normalizeEmail(loginRaw);
  const loginPhone = normalizePhone(loginRaw);

  if (emailNorm) return { email: emailNorm };
  if (phoneNorm) return { phone: phoneNorm };
  if (loginEmail) return { email: loginEmail };
  if (loginPhone) return { phone: loginPhone };
  return null;
}

class AuthService {
  async register(name, email, password, phone) {
    // Validate input
    if (!name || !email || !password || !phone) {
      throw AppError.badRequest(MESSAGES.REQUIRED_FIELDS, "REQUIRED_FIELDS");
    }

    if (password.length < 6) {
      throw AppError.badRequest(MESSAGES.PASSWORD_MIN, "PASSWORD_MIN");
    }

    const emailNorm = normalizeEmail(email);
    if (!emailNorm) {
      throw AppError.badRequest(MESSAGES.REQUIRED_FIELDS, "REQUIRED_FIELDS");
    }

    const phoneNorm = normalizePhone(phone);
    if (!phoneNorm) {
      throw AppError.badRequest(MESSAGES.PHONE_INVALID, "PHONE_INVALID");
    }

    // Check if email exists
    const existingUser = await User.findOne({
      email: emailNorm,
    });
    if (existingUser) {
      throw AppError.conflict(MESSAGES.EMAIL_EXISTS, "EMAIL_EXISTS");
    }

    const existingPhone = await User.findOne({ phone: phoneNorm });
    if (existingPhone) {
      throw AppError.conflict(MESSAGES.PHONE_EXISTS, "PHONE_EXISTS");
    }

    // Create user
    const user = await User.create({
      name,
      email: emailNorm,
      password,
      phone: phoneNorm,
    });

    // Send welcome notification
    await Notification.create({
      userId: user._id,
      title: "Xush kelibsiz! 🌸",
      message: `Salom ${user.name}! Porla platformasiga xush kelibsiz. Birinchi darsni boshlang!`,
      type: "achievement",
    }).catch(() => {});

    return user;
  }

  async login({ email, phone, login, password }) {
    // Validate input
    if (!password) {
      throw AppError.badRequest(
        "Email yoki telefon raqam va parol talab qilinadi",
        "REQUIRED_FIELDS"
      );
    }

    const query = buildLoginQuery({ email, phone, login });
    if (!query) {
      throw AppError.badRequest(
        "Email yoki telefon raqam va parol talab qilinadi",
        "REQUIRED_FIELDS"
      );
    }

    // Find user and include password
    const user = await User.findOne(query).select("+password");

    if (!user || !(await user.comparePassword(password))) {
      throw AppError.unauthorized(MESSAGES.INVALID_CREDENTIALS, "INVALID_CREDENTIALS");
    }

    // Check if blocked
    if (user.isBlocked) {
      throw AppError.forbidden(MESSAGES.USER_BLOCKED, "USER_BLOCKED");
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    return {
      user,
      phoneSetupRequired: !user.phone,
    };
  }

  async updateProfile(userId, name, avatar) {
    const update = {};
    if (name) update.name = name;
    if (avatar) update.avatar = avatar;

    const user = await User.findByIdAndUpdate(userId, update, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      throw AppError.notFound(MESSAGES.USER_NOT_FOUND, "USER_NOT_FOUND");
    }

    return user;
  }

  async updatePhone(userId, phone) {
    const phoneNorm = normalizePhone(phone);
    if (!phoneNorm) {
      throw AppError.badRequest(MESSAGES.PHONE_INVALID, "PHONE_INVALID");
    }

    const existing = await User.findOne({ phone: phoneNorm, _id: { $ne: userId } });
    if (existing) {
      throw AppError.conflict(MESSAGES.PHONE_EXISTS, "PHONE_EXISTS");
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { phone: phoneNorm },
      { new: true, runValidators: true }
    );

    if (!user) {
      throw AppError.notFound(MESSAGES.USER_NOT_FOUND, "USER_NOT_FOUND");
    }

    return user;
  }

  async changePassword(userId, currentPassword, newPassword) {
    // Validate input
    if (!currentPassword || !newPassword) {
      throw AppError.badRequest(
        "Joriy va yangi parol talab qilinadi",
        "REQUIRED_FIELDS"
      );
    }

    if (newPassword.length < 6) {
      throw AppError.badRequest(MESSAGES.PASSWORD_MIN, "PASSWORD_MIN");
    }

    // Get user with password
    const user = await User.findById(userId).select("+password");
    if (!user) {
      throw AppError.notFound(MESSAGES.USER_NOT_FOUND, "USER_NOT_FOUND");
    }

    // Verify current password
    if (!(await user.comparePassword(currentPassword))) {
      throw AppError.badRequest(MESSAGES.PASSWORD_INVALID, "PASSWORD_INVALID");
    }

    // Update password
    user.password = newPassword;
    await user.save();

    return user;
  }
}

module.exports = new AuthService();
