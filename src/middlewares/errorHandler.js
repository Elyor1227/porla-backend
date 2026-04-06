/**
 * Error Handling Middleware
 */

const errorHandler = (err, req, res, next) => {
  console.error("❌", err.message);

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
    });
  }

  // Default error
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Server ichki xatosi",
  });
};

module.exports = errorHandler;
