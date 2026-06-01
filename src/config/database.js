/**
 * Database Configuration
 * MongoDB ulanishi: connection pooling + reconnection event'lari
 */

const mongoose = require("mongoose");
const logger = require("../utils/logger");

const toInt = (v, fallback) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
};

const connectDB = async () => {
  // Strict query (Mongoose 7+ default true, lekin aniq belgilaymiz)
  mongoose.set("strictQuery", true);

  const conn = mongoose.connection;
  conn.on("connected", () => logger.info("✅  MongoDB ga ulandi"));
  conn.on("error", (err) => logger.error({ err }, "MongoDB xatosi"));
  conn.on("disconnected", () => logger.warn("⚠  MongoDB ulanishi uzildi"));
  conn.on("reconnected", () => logger.info("🔄  MongoDB qayta ulandi"));

  try {
    return await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: toInt(process.env.MONGO_MAX_POOL, 20),
      minPoolSize: toInt(process.env.MONGO_MIN_POOL, 2),
      serverSelectionTimeoutMS: toInt(process.env.MONGO_SERVER_SELECTION_MS, 10000),
      socketTimeoutMS: toInt(process.env.MONGO_SOCKET_TIMEOUT_MS, 45000),
    });
  } catch (error) {
    logger.error({ err: error }, "MongoDB ulanishida boshlang'ich xato");
    process.exit(1);
  }
};

module.exports = { connectDB };
