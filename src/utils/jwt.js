/**
 * JWT Token Utilities
 *
 * Access token — qisqa(roq) muddatli, har bir so'rovda ishlatiladi.
 * Refresh token — uzoq muddatli, faqat yangi access token olish uchun.
 * Har bir access token'da `jti` bor — logout'da blacklist qilish uchun.
 */

const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { JWT_SECRET, JWT_EXPIRES, JWT_REFRESH_EXPIRES } = require("../config/constants");

const newJti = () => crypto.randomBytes(16).toString("hex");

const signToken = (id) => {
  return jwt.sign({ id, type: "access", jti: newJti() }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES,
  });
};

const signRefreshToken = (id) => {
  return jwt.sign({ id, type: "refresh", jti: newJti() }, JWT_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES,
  });
};

const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

module.exports = {
  signToken,
  signRefreshToken,
  verifyToken,
};
