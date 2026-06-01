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
const pinoHttp = require("pino-http");
require("dotenv").config();

const logger = require("./utils/logger");

// Config imports
const { connectDB } = require("./config/database");
const { corsOptions } = require("./config/cors");
const { RATE_LIMIT, PORT } = require("./config/constants");
const { validateEnv } = require("./config/validateEnv");

// Muhit o'zgaruvchilarini darhol tekshirish (kritik kalitlar yo'q bo'lsa exit)
validateEnv();

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
const swaggerUi = require("swagger-ui-express");
const buildOpenApiSpec = require("./docs/openapi");

// Utilities
const autoSeed = require("./utils/autoSeed");
const {
  ensureVideoUploadDirs,
  validateVideoStorageOnStartup,
} = require("./utils/videoUpload");
const { startTelegramBot } = require("./services/telegramBotService");

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
// REQUEST LOGGING
// ════════════════════════════════════════════════════════

app.use(
  pinoHttp({
    logger,
    autoLogging: {
      // health check va video oqimini logga to'ldirib yubormaymiz
      ignore: (req) =>
        req.url === "/api/health" || /\/video(\?|$)/.test(req.url),
    },
  })
);

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

// Swagger docs
app.get("/api/openapi.json", (req, res) => res.json(buildOpenApiSpec()));
app.use(
  "/api/docs",
  swaggerUi.serve,
  swaggerUi.setup(buildOpenApiSpec(), {
    explorer: true,
    customSiteTitle: "Porla API Docs",
  })
);

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

    validateVideoStorageOnStartup();
    ensureVideoUploadDirs();

    await autoSeed();

    // Start server
    const server = app.listen(PORT, () => {
      logger.info(`🌸  Porla Backend — http://localhost:${PORT}`);
      logger.info(`📋  Health: http://localhost:${PORT}/api/health`);

      // PM2 cluster rejimida polling konfliktidan saqlanish:
      // Telegram botni faqat bitta instance ishga tushiradi (0 yoki yagona).
      const pmId = process.env.NODE_APP_INSTANCE;
      if (pmId === undefined || pmId === "0") {
        startTelegramBot();
      } else {
        logger.info(`Telegram bot instance #${pmId} da o'tkazib yuborildi (polling konflikti oldini olish)`);
      }
    });

    setupGracefulShutdown(server);
  } catch (error) {
    logger.error({ err: error }, "Server startup xatosi");
    process.exit(1);
  }
};

/**
 * Graceful shutdown — SIGTERM/SIGINT'da HTTP serverni va Mongo ulanishini
 * tartibli yopadi, ishlab turgan so'rovlar tugashini kutadi.
 */
const setupGracefulShutdown = (server) => {
  const mongoose = require("mongoose");
  let shuttingDown = false;

  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`${signal} qabul qilindi — server tartibli yopilmoqda...`);

    // Yangi so'rovlarni qabul qilishni to'xtatamiz
    server.close(async () => {
      try {
        await mongoose.connection.close(false);
        logger.info("MongoDB ulanishi yopildi. Xayr 🌸");
        process.exit(0);
      } catch (err) {
        logger.error({ err }, "Shutdown paytida xato");
        process.exit(1);
      }
    });

    // Majburiy timeout — 10s ichida yopilmasa, force exit
    setTimeout(() => {
      logger.error("Tartibli shutdown vaqti tugadi, majburan yopilmoqda");
      process.exit(1);
    }, 10000).unref();
  };

  ["SIGTERM", "SIGINT"].forEach((sig) => process.on(sig, () => shutdown(sig)));

  process.on("unhandledRejection", (reason) => {
    logger.error({ err: reason }, "Unhandled Promise Rejection");
  });
  process.on("uncaughtException", (err) => {
    logger.error({ err }, "Uncaught Exception");
    shutdown("uncaughtException");
  });
};

// Start server if this is the main module
if (require.main === module) {
  startServer();
}

module.exports = app;
