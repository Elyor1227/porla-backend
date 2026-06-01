/**
 * Constants Configuration
 * Centralized constants for the application
 */

// Maxfiy kalitlar faqat env'dan olinadi (fallback yo'q — validateEnv startupda tekshiradi)
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES = process.env.JWT_EXPIRES || "30d";
const JWT_REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || "90d";
const ADMIN_KEY = process.env.ADMIN_KEY;
const PORT = process.env.PORT || 5000;
/** To'liq API manzili (masalan https://api.sayt.uz). Bo'sh bo'lsa videoUrl nisbiy /api/... bo'ladi. */
const PUBLIC_API_URL = (process.env.PUBLIC_API_URL || "").replace(/\/$/, "");

const toInt = (v, fallback) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
};

const RATE_LIMIT = {
  // Brute-force'ga qarshi: env bilan sozlanadi, default qiymatlar qattiqroq
  auth: {
    windowMs: toInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS, 15 * 60 * 1000),
    max: toInt(process.env.RATE_LIMIT_AUTH_MAX, 20),
  },
  general: {
    windowMs: toInt(process.env.RATE_LIMIT_GENERAL_WINDOW_MS, 15 * 60 * 1000),
    max: toInt(process.env.RATE_LIMIT_GENERAL_MAX, 1000),
  },
  qnaSubmit: {
    windowMs: toInt(process.env.RATE_LIMIT_QNA_WINDOW_MS, 15 * 60 * 1000),
    max: toInt(process.env.RATE_LIMIT_QNA_MAX, 30),
  },
};

const MESSAGES = {
  // Auth
  AUTH_REQUIRED: "Kirish uchun tizimga kiring",
  TOKEN_INVALID: "Token noto'g'ri",
  TOKEN_EXPIRED: "Token muddati tugagan, qayta kiring",
  LOGIN_SUCCESS: "Tizimga muvaffaqiyatli kirdingiz",
  LOGOUT_SUCCESS: "Tizimdan chiqdingiz",
  REGISTER_SUCCESS: "Muvaffaqiyatli ro'yxatdan o'tdingiz",
  EMAIL_EXISTS: "Bu email allaqachon ro'yxatdan o'tgan",
  PHONE_EXISTS: "Bu telefon raqam allaqachon ro'yxatdan o'tgan",
  INVALID_CREDENTIALS: "Email yoki parol noto'g'ri",
  USER_BLOCKED: "Hisobinguz bloklangan. Murojaat: support@porla.uz",
  
  // Validation
  REQUIRED_FIELDS: "Barcha maydonlar to'ldirilishi shart",
  PASSWORD_MIN: "Parol kamida 6 ta belgi bo'lishi kerak",
  PASSWORD_INVALID: "Joriy parol noto'g'ri",
  PHONE_REQUIRED: "Telefon raqam majburiy",
  PHONE_INVALID: "Telefon raqam noto'g'ri formatda",
  
  // Courses
  COURSE_NOT_FOUND: "Kurs topilmadi",
  COURSE_LOCKED: "Bu kurs Premium foydalanuvchilar uchun",
  LESSON_NOT_FOUND: "Dars topilmadi",
  
  // Tracker
  CYCLE_NOT_FOUND: "Tsikl topilmadi",
  CYCLE_START_REQUIRED: "Boshlanish sanasi majburiy",
  CYCLE_NOT_STARTED: "Avval tsikl boshlang",
  
  // Notifications
  NO_NOTIFICATIONS: "Bildirishnomalar topilmadi",
  
  // Q&A
  QUESTION_MIN: "Savol kamina 5 ta belgi bo'lishi kerak",
  ANSWER_MIN: "Javob kamina 3 ta belgi bo'lishi kerak",
  QUESTION_SUBMITTED: "Savolingiz yuborildi! Adminlar tez orada ko'rib chiqadi.",
  QUESTION_NOT_FOUND: "Savol topilmadi yoki hali nashr etilmagan",
  ANSWER_REQUIRED: "Javob matni majburiy",
  
  // Admin
  ADMIN_REQUIRED: "Admin huquqi talab qilinadi",
  ADMIN_ALREADY_EXISTS: "Admin allaqon mavjud",
  ADMIN_CREATED: "Admin yaratildi",
  USER_NOT_FOUND: "Foydalanuvchi topilmadi",
  CANNOT_DELETE_ADMIN: "Admin o'chirilmaydi",
  
  // Errors
  ROUTE_NOT_FOUND: "Route topilmadi",
  VALIDATION_ERROR: "Validatsiya xatosi",
  DUPLICATE_ERROR: "Bu {field} allaqachon mavjud",
  CAST_ERROR: "Noto'g'ri ID format",
  INTERNAL_ERROR: "Server ichki xatosi",
};

const NOTIFICATION_TYPES = ["info", "reminder", "achievement", "warning"];
const QNA_STATUSES = ["pending", "answered"];
const MOOD_ENUM = ["happy", "neutral", "sad", "anxious", "angry", ""];
const TIP_CATEGORIES = ["sog'liq", "ovqatlanish", "jismoniy", "ruhiy", "sikl", "umumiy"];

module.exports = {
  JWT_SECRET,
  JWT_EXPIRES,
  JWT_REFRESH_EXPIRES,
  ADMIN_KEY,
  PORT,
  PUBLIC_API_URL,
  RATE_LIMIT,
  MESSAGES,
  NOTIFICATION_TYPES,
  QNA_STATUSES,
  MOOD_ENUM,
  TIP_CATEGORIES,
};
