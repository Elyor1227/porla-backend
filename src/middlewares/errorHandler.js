/**
 * Error Handling Middleware
 */

const logger = require("../utils/logger");

const errorHandler = (err, req, res, next) => {
  // 5xx xatolarni to'liq, mijoz xatolarini (4xx) qisqa logga yozamiz
  const status = err.statusCode || 500;
  if (status >= 500) {
    logger.error({ err, path: req.originalUrl, method: req.method }, err.message);
  } else {
    logger.warn({ path: req.originalUrl, method: req.method, code: err.code }, err.message);
  }

  // Mongoose Validation Error
  if (err.name === "ValidationError") {
    const msg = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
    return res.status(400).json({
      success: false,
      message: msg,
    });
  }

  // Mongoose Duplicate Key Error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(409).json({
      success: false,
      message: `Bu ${field} allaqachon mavjud`,
    });
  }

  // Mongoose Cast Error
  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Noto'g'ri ID format",
    });
  }

  // Multer (video yuklash)
  if (err.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "Video fayl hajmi juda katta (maks. 500 MB)",
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message || "Fayl yuklash xatosi",
    });
  }

  // Custom AppError
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.code ? { code: err.code } : {}),
      ...(err.details && typeof err.details === "object" ? err.details : {}),
    });
  }

  // Default error
  res.status(500).json({
    success: false,
    message: err.message || "Server ichki xatosi",
    code: "INTERNAL_ERROR",
  });
};

module.exports = errorHandler;
