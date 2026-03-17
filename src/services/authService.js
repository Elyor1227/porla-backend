/**
 * Authentication Service
 * Business logic for auth operations
 */

const User = require("../models/User");
const Notification = require("../models/Notification");
const { MESSAGES } = require("../config/constants");

class AuthService {
  async register(name, email, password) {
    // Validate input
    if (!name || !email || !password) {
      throw new Error(MESSAGES.REQUIRED_FIELDS);
    }

    if (password.length < 6) {
      throw new Error(MESSAGES.PASSWORD_MIN);
    }

    // Check if email exists
    const existingUser = await User.findOne({
      email: email.toLowerCase(),
    });
    if (existingUser) {
      throw new Error(MESSAGES.EMAIL_EXISTS);
    }

    // Create user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
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

  async login(email, password) {
    // Validate input
    if (!email || !password) {
      throw new Error("Email va parol talab qilinadi");
    }

    // Find user and include password
    const user = await User.findOne({
      email: email.toLowerCase(),
    }).select("+password");

    if (!user || !(await user.comparePassword(password))) {
      throw new Error(MESSAGES.INVALID_CREDENTIALS);
    }

    // Check if blocked
    if (user.isBlocked) {
      throw new Error(MESSAGES.USER_BLOCKED);
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    return user;
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
      throw new Error(MESSAGES.USER_NOT_FOUND);
    }

    return user;
  }

  async changePassword(userId, currentPassword, newPassword) {
    // Validate input
    if (!currentPassword || !newPassword) {
      throw new Error("Joriy va yangi parol talab qilinadi");
    }

    if (newPassword.length < 6) {
      throw new Error(MESSAGES.PASSWORD_MIN);
    }

    // Get user with password
    const user = await User.findById(userId).select("+password");
    if (!user) {
      throw new Error(MESSAGES.USER_NOT_FOUND);
    }

    // Verify current password
    if (!(await user.comparePassword(currentPassword))) {
      throw new Error(MESSAGES.PASSWORD_INVALID);
    }

    // Update password
    user.password = newPassword;
    await user.save();

    return user;
  }
}

module.exports = new AuthService();
