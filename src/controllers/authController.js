/**
 * Auth Controller
 */

const authService = require("../services/authService");
const { sendToken, sendSuccess, sendError } = require("../utils/response");

class AuthController {
  async register(req, res, next) {
    try {
      const { name, email, password, phone } = req.body;
      const user = await authService.register(name, email, password, phone);
      sendToken(res, user, 201, "Muvaffaqiyatli ro'yxatdan o'tdingiz");
    } catch (err) {
      if (err.message.includes("majburiy")) {
        return sendError(res, err.message, 400);
      }
      if (err.message.includes("formatda")) {
        return sendError(res, err.message, 400);
      }
      if (err.message.includes("allaqachon")) {
        return sendError(res, err.message, 409);
      }
      next(err);
    }
  }

  async login(req, res, next) {
    try {
      const { email, phone, login, password } = req.body;
      const result = await authService.login({
        email,
        phone,
        login,
        password,
      });
      sendToken(
        res,
        result.user,
        200,
        "Tizimga muvaffaqiyatli kirdingiz",
        {
          phoneSetupRequired: result.phoneSetupRequired,
        }
      );
    } catch (err) {
      if (err.message.includes("majburiy")) {
        return sendError(res, err.message, 400);
      }
      if (err.message.includes("telefon raqam")) {
        return sendError(res, err.message, 400);
      }
      if (err.message.includes("noto'g'ri")) {
        return sendError(res, err.message, 401);
      }
      if (err.message.includes("bloklangan")) {
        return sendError(res, err.message, 403);
      }
      next(err);
    }
  }

  async getMe(req, res, next) {
    try {
      const u = req.user.toPublicJSON();
      if (u.isPro && u.proExpiresAt) {
        const msLeft = new Date(u.proExpiresAt) - new Date();
        u.proDaysLeft = Math.max(0, Math.ceil(msLeft / 86400000));
        u.proExpired = msLeft < 0;
      }
      sendSuccess(res, { user: u });
    } catch (err) {
      next(err);
    }
  }

  async logout(req, res, next) {
    try {
      sendSuccess(res, { message: "Tizimdan chiqdingiz" });
    } catch (err) {
      next(err);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const { name, avatar } = req.body;
      const user = await authService.updateProfile(
        req.user._id,
        name,
        avatar
      );
      sendSuccess(res, {
        message: "Profil yangilandi",
        user: user.toPublicJSON(),
      });
    } catch (err) {
      next(err);
    }
  }

  async updatePhone(req, res, next) {
    try {
      const { phone } = req.body;
      const user = await authService.updatePhone(req.user._id, phone);
      sendSuccess(res, {
        message: "Telefon raqam saqlandi",
        user: user.toPublicJSON(),
      });
    } catch (err) {
      if (err.message.includes("formatda")) {
        return sendError(res, err.message, 400);
      }
      if (err.message.includes("allaqachon")) {
        return sendError(res, err.message, 409);
      }
      next(err);
    }
  }

  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      await authService.changePassword(
        req.user._id,
        currentPassword,
        newPassword
      );
      sendSuccess(res, { message: "Parol muvaffaqiyatli o'zgartirildi" });
    } catch (err) {
      if (err.message.includes("majburiy")) {
        return sendError(res, err.message, 400);
      }
      if (err.message.includes("noto'g'ri")) {
        return sendError(res, err.message, 400);
      }
      next(err);
    }
  }
}

module.exports = new AuthController();
