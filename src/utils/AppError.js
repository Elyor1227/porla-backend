/**
 * Custom Error Class
 *
 * statusCode — HTTP holat kodi
 * code       — mashina o'qiy oladigan xato kodi (string matching o'rniga)
 * details    — qo'shimcha maydonlar (masalan { isPro: true })
 */

class AppError extends Error {
  constructor(message, statusCode = 500, code = "INTERNAL_ERROR", details = {}) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details || {};
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  // Qulay factory metodlar
  static badRequest(message, code = "BAD_REQUEST", details) {
    return new AppError(message, 400, code, details);
  }
  static unauthorized(message, code = "UNAUTHORIZED", details) {
    return new AppError(message, 401, code, details);
  }
  static forbidden(message, code = "FORBIDDEN", details) {
    return new AppError(message, 403, code, details);
  }
  static notFound(message, code = "NOT_FOUND", details) {
    return new AppError(message, 404, code, details);
  }
  static conflict(message, code = "CONFLICT", details) {
    return new AppError(message, 409, code, details);
  }
}

module.exports = AppError;
