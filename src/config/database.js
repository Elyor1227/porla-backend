/**
 * Database Configuration
 * Handles MongoDB connection setup
 */

const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGODB_URI
    );
    console.log("✅  MongoDB ga ulandi");
    return conn;
  } catch (error) {
    console.error("❌  MongoDB xatosi:", error.message);
    process.exit(1);
  }
};

module.exports = { connectDB };
