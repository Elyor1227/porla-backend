/**
 * Auth Controller
 */

const authService = require("../services/authService");
const { sendToken, sendSuccess, sendError } = require("../utils/response");
const { computeProMeta } = require("../utils/proStatus");
const { signToken, verifyToken } = require("../utils/jwt");
const { blacklist } = require("../utils/tokenBlacklist");
const { MESSAGES } = require("../config/constants");

class AuthController {
  async register(req, res, next) {
    try {
      const { name, email, password, phone } = req.body;
      const user = await authService.register(name, email, password, phone);
      sendToken(res, user, 201, "Muvaffaqiyatli ro'yxatdan o'tdingiz");
    } catch (err) {
      next(err);
    }
  }

  async login(req, res, next) {
    try {
      const { email, phone, login, password } = req.body;
      const result = await authService.login({ email, phone, login, password });
      sendToken(res, result.user, 200, "Tizimga muvaffaqiyatli kirdingiz", {
        phoneSetupRequired: result.phoneSetupRequired,
      });
    } catch (err) {
      next(err);
    }
  }

  async getMe(req, res, next) {
    try {
      const u = req.user.toPublicJSON();
      Object.assign(u, computeProMeta(u));
      sendSuccess(res, { user: u });
    } catch (err) {
      next(err);
    }
  }

  async logout(req, res, next) {
    try {
      // Joriy access tokenni blacklistga qo'shamiz (haqiqiy logout)
      const header = req.headers.authorization;
      if (header?.startsWith("Bearer ")) {
        try {
          const decoded = verifyToken(header.split(" ")[1]);
          await blacklist(decoded.jti, decoded.exp);
        } catch (_) {
          // Token noto'g'ri/eskirgan bo'lsa ham logout muvaffaqiyatli hisoblanadi
        }
      }
      sendSuccess(res, { message: "Tizimdan chiqdingiz" });
    } catch (err) {
      next(err);
    }
  }

  // Refresh token orqali yangi access token olish
  async refresh(req, res, next) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return sendError(res, "refreshToken kerak", 400, { code: "REQUIRED_FIELDS" });
      }

      let decoded;
      try {
        decoded = verifyToken(refreshToken);
      } catch (_) {
        return sendError(res, MESSAGES.TOKEN_INVALID, 401, { code: "TOKEN_INVALID" });
      }

      if (decoded.type !== "refresh") {
        return sendError(res, MESSAGES.TOKEN_INVALID, 401, { code: "TOKEN_INVALID" });
      }

      const token = signToken(decoded.id);
      sendSuccess(res, { message: "Token yangilandi", token });
    } catch (err) {
      next(err);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const { name, avatar } = req.body;
      const user = await authService.updateProfile(req.user._id, name, avatar);
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
      next(err);
    }
  }

  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      await authService.changePassword(req.user._id, currentPassword, newPassword);
      sendSuccess(res, { message: "Parol muvaffaqiyatli o'zgartirildi" });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthController();
