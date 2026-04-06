/**
 * Main Application Entry Point
 * Porla — Women's Health Backend
 * 
 * Architecture: Layered (Routes → Controllers → Services → Models)
 */

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

// Config imports
const { connectDB } = require("./config/database");
const { corsOptions } = require("./config/cors");
const { RATE_LIMIT, PORT } = require("./config/constants");

// Middleware imports
const errorHandler = require("./middlewares/errorHandler");

// Route imports
const authRoutes = require("./routes/authRoutes");
const courseRoutes = require("./routes/courseRoutes");
const trackerRoutes = require("./routes/trackerRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const qnaRoutes = require("./routes/qnaRoutes");
const dailyTipRoutes = require("./routes/dailyTipRoutes");
const adminRoutes = require("./routes/adminRoutes");

// Utilities
const autoSeed = require("./utils/autoSeed");
const { ensureVideoUploadDirs } = require("./utils/videoUpload");

// Initialize app
const app = express();

// ════════════════════════════════════════════════════════
// SECURITY MIDDLEWARE
// ════════════════════════════════════════════════════════

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(cors(corsOptions));

// ════════════════════════════════════════════════════════
// BODY PARSER MIDDLEWARE
// ════════════════════════════════════════════════════════

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ════════════════════════════════════════════════════════
// RATE LIMITING MIDDLEWARE
// ════════════════════════════════════════════════════════

const authLimiter = rateLimit({
  windowMs: RATE_LIMIT.auth.windowMs,
  max: RATE_LIMIT.auth.max,
  message: {
    success: false,
    message: "Juda ko'p urinish. 15 daqiqadan keyin qayta urinib ko'ring.",
  },
});

const generalLimiter = rateLimit({
  windowMs: RATE_LIMIT.general.windowMs,
  max: RATE_LIMIT.general.max,
});

const qnaSubmitLimiter = rateLimit({
  windowMs: RATE_LIMIT.qnaSubmit.windowMs,
  max: RATE_LIMIT.qnaSubmit.max,
  message: {
    success: false,
    message: "Juda tez-tez yuborilmoqda. 15 daqiqadan keyin qayta urinib ko'ring.",
  },
});

app.use("/api/auth", authLimiter);
app.use("/api", generalLimiter);

// ════════════════════════════════════════════════════════
// ROUTES
// ════════════════════════════════════════════════════════

app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/tracker", trackerRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/qna", qnaRoutes);
app.use("/api/tips", dailyTipRoutes);
app.use("/api/admin", adminRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    service: "Porla Backend",
    version: "2.0.0",
    db: require("mongoose").connection.readyState === 1
      ? "connected"
      : "disconnected",
    time: new Date().toISOString(),
  });
});

// ════════════════════════════════════════════════════════
// 404 HANDLER
// ════════════════════════════════════════════════════════

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route topilmadi: ${req.originalUrl}`,
  });
});

// ════════════════════════════════════════════════════════
// ERROR HANDLER (Must be last)
// ════════════════════════════════════════════════════════

app.use(errorHandler);

// ════════════════════════════════════════════════════════
// DATABASE CONNECTION & SERVER START
// ════════════════════════════════════════════════════════

const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    ensureVideoUploadDirs();

    await autoSeed();

    // Start server
    app.listen(PORT, () => {
      console.log(`\n🌸  Porla Backend — http://localhost:${PORT}`);
      console.log(`📋  Health: http://localhost:${PORT}/api/health\n`);
    });
  } catch (error) {
    console.error("❌  Server startup xatosi:", error.message);
    process.exit(1);
  }
};

// Start server if this is the main module
if (require.main === module) {
  startServer();
}

module.exports = app;
