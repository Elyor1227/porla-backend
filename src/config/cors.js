/**
 * CORS Configuration
 */

const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim());

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (!process.env.NODE_ENV || process.env.NODE_ENV === "development") {
      if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return cb(null, true);
      if (/^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) return cb(null, true);
    }
    if (allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error("CORS: " + origin + " ruxsatsiz"));
  },
  credentials: true,
};

module.exports = { corsOptions };
