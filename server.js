
/**
 * ╔══════════════════════════════════════════════════════╗
 * ║         PORLA — Ayollar Salomatligi Backend          ║
 * ║         Node.js + Express + MongoDB + JWT            ║
 * ╚══════════════════════════════════════════════════════╝
 *
 * npm install express mongoose bcryptjs jsonwebtoken cors helmet express-rate-limit dotenv
 * node server.js
 *
 * .env:
 *   MONGODB_URI=mongodb+srv://...
 *   JWT_SECRET=your_secret_here
 *   FRONTEND_URL=https://your-frontend.vercel.app
 *   ADMIN_KEY=porla_admin_2024
 *   PORT=5000
 */

const express   = require("express");
const mongoose  = require("mongoose");
const bcrypt    = require("bcryptjs");
const jwt       = require("jsonwebtoken");
const cors      = require("cors");
const helmet    = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const app = express();

app.use(helmet());
const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173").split(",").map(o => o.trim());
app.use(cors({
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
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 500,
  message: { success: false, message: "Juda ko'p urinish. 15 daqiqadan keyin qayta urinib ko'ring." },
});
const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 });
// ✅ YANGI: Q&A yuborishga alohida limiter
const qnaSubmitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { success: false, message: "Juda tez-tez yuborilmoqda. 15 daqiqadan keyin qayta urinib ko'ring." },
});
app.use("/api/auth", authLimiter);
app.use("/api", generalLimiter);

async function autoSeed() {
  const count = await Course.countDocuments().catch(() => 0);
  if (count > 0) return;
  console.log("🌱  AutoSeed: kurslar qo'shilmoqda...");
  try {
    const cList = await Course.insertMany([
      { title: "Ayollar reproduktiv tizimi",           description: "Reproduktiv organlar, ularning vazifalari va asosiy tushunchalar.",    icon: "🩺", color: "#3b7de8", bgColor: "#eff6ff", isPro: false, order: 1 },
      { title: "Hayz sikli",                           description: "Normal tsikl, uning fazalari, ta'sir etuvchi omillar va kuzatish.",     icon: "🌸", color: "#d64f6e", bgColor: "#fde8ec", isPro: false, order: 2 },
      { title: "Ayol gormonlari salomatligi o'rni", description: "Gormonlar, ularning muvozanati va sog'liqqa ta'siri haqida kurs.",      icon: "⚗️", color: "#8657d6", bgColor: "#f3f0ff", isPro: true,  order: 3 },
      { title: "Vaginal ajralmalar",                   description: "Normal va g'ayri-normal ajralmalarni farqlash, qachon murojaat qilish.", icon: "💧", color: "#0891b2", bgColor: "#ecfeff", isPro: true,  order: 4 },
      { title: "Anemiya",                              description: "Temir tanqisligi, belgilari, sabablari va davolash usullari.",           icon: "🩸", color: "#dc2626", bgColor: "#fef2f2", isPro: true,  order: 5 },
    ]);
    const lessons = [];
    cList.forEach(c => {
      const total = c.isPro ? 3 : 2;
      for (let i = 1; i <= total; i++)
        lessons.push({ courseId: c._id, title: c.title + " — " + i + "-dars",
          content: i === 1 ? "Asosiy tushunchalar bilan tanishish. Keyingi darslarda amaliy misollar bo'ladi." : "Amaliy mashg'ulot va mustahkamlash.",
          videoUrl: "", duration: 8 + i * 4, order: i, isPro: c.isPro });
    });
    await Lesson.insertMany(lessons);
    console.log("✅  AutoSeed: " + cList.length + " kurs, " + lessons.length + " dars qo'shildi");
  } catch (e) { console.error("⚠  AutoSeed xatosi:", e.message); }
}

mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/porla")
  .then(async () => {
    console.log("✅  MongoDB ga ulandi");
    await autoSeed();
  })
  .catch(err => { console.error("❌  MongoDB xatosi:", err.message); process.exit(1); });

// ═══════════════════════════════════════════════════════
//                       SCHEMAS
// ═══════════════════════════════════════════════════════

const userSchema = new mongoose.Schema({
  name:             { type: String, required: [true,"Ism majburiy"], trim: true, minlength: 2, maxlength: 50 },
  email:            { type: String, required: [true,"Email majburiy"], unique: true, lowercase: true, trim: true,
                      match: [/^\S+@\S+\.\S+$/, "Email noto'g'ri formatda"] },
  password:         { type: String, required: [true,"Parol majburiy"], minlength: 6, select: false },
  avatar:           { type: String, default: "" },
  isPro:            { type: Boolean, default: false },
  proExpiresAt:     { type: Date, default: null },
  completedLessons: [{ type: mongoose.Schema.Types.ObjectId, ref: "Lesson" }],
  lastLogin:        { type: Date, default: null },
  // ✅ YANGI
  isAdmin:          { type: Boolean, default: false },
  isBlocked:        { type: Boolean, default: false },
}, { timestamps: true });

// ✅ TUZATILDI: next() qo'shildi
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function (pwd) {
  return bcrypt.compare(pwd, this.password);
};

// ✅ YANGI: isAdmin, isBlocked ham qaytariladi
userSchema.methods.toPublicJSON = function () {
  const { _id, name, email, avatar, isPro, proExpiresAt,
          completedLessons, createdAt, lastLogin, isAdmin, isBlocked } = this;
  return { _id, name, email, avatar, isPro, proExpiresAt,
           completedLessons, createdAt, lastLogin, isAdmin, isBlocked };
};
const User = mongoose.model("User", userSchema);

const courseSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  description: { type: String, required: true },
  icon:        { type: String, default: "📚" },
  color:       { type: String, default: "#d64f6e" },
  bgColor:     { type: String, default: "#fde8ec" },
  isPro:       { type: Boolean, default: false },
  order:       { type: Number, default: 0 },
  isActive:    { type: Boolean, default: true },
}, { timestamps: true });
const Course = mongoose.model("Course", courseSchema);

const lessonSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  title:    { type: String, required: true, trim: true },
  content:  { type: String, required: true },
  videoUrl: { type: String, default: "" },
  duration: { type: Number, default: 0 },
  order:    { type: Number, default: 0 },
  isPro:    { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });
const Lesson = mongoose.model("Lesson", lessonSchema);

const cycleSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  startDate:   { type: Date, required: [true,"Boshlanish sanasi majburiy"] },
  endDate:     { type: Date, default: null },
  cycleLength: { type: Number, default: 28, min: 15, max: 60 },
  symptoms: [{
    date:      { type: Date, required: true },
    items:     [String],
    mood:      { type: String, enum: ["happy","neutral","sad","anxious","angry",""], default: "" },
    painLevel: { type: Number, min: 0, max: 10, default: 0 },
    notes:     { type: String, default: "" },
  }],
  notes: { type: String, default: "" },
}, { timestamps: true });
const Cycle = mongoose.model("Cycle", cycleSchema);

const notifSchema = new mongoose.Schema({
  userId:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title:   { type: String, required: true },
  message: { type: String, required: true },
  type:    { type: String, enum: ["info","reminder","achievement","warning"], default: "info" },
  isRead:  { type: Boolean, default: false },
}, { timestamps: true });
const Notification = mongoose.model("Notification", notifSchema);

// ✅ YANGI: Anonim savollar (Q&A)
const qnaSchema = new mongoose.Schema({
  question:     { type: String, required: [true, "Savol matni majburiy"], maxlength: 2000, trim: true },
  topic:        { type: String, default: "" },
  answer:       { type: String, default: "" },
  status:       { type: String, enum: ["pending","answered"], default: "pending" },
  isPublished:  { type: Boolean, default: false },
  askedBy:      { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, // ixtiyoriy
  askedName:    { type: String, default: "" },   // ixtiyoriy ko'rsatkich
  contact:      { type: String, default: "" },   // email/telegram ixtiyoriy
  askedIp:      { type: String, default: "" },
  answeredBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  answeredAt:   { type: Date, default: null },
}, { timestamps: true });
qnaSchema.index({ isPublished: 1, answeredAt: -1 });
qnaSchema.index({ status: 1, createdAt: -1 });
const Qna = mongoose.model("Qna", qnaSchema);

// ✅ YANGI: Kunlik maslahatlar (Daily Tips)
const dailyTipSchema = new mongoose.Schema({
  content:     { type: String, required: [true,"Matn majburiy"], trim: true, maxlength: 600 },
  category:    { type: String, enum: ["sog'liq","ovqatlanish","jismoniy","ruhiy","sikl","umumiy"], default: "umumiy" },
  emoji:       { type: String, default: "💡" },
  isActive:    { type: Boolean, default: true },
  // Agar publishDate bo'lsa — faqat o'sha kun ko'rsatiladi; bo'sh = har kuni navbat bilan
  publishDate: { type: String, default: "" },   // "YYYY-MM-DD"
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });
const DailyTip = mongoose.model("DailyTip", dailyTipSchema);

// ═══════════════════════════════════════════════════════
//                     MIDDLEWARE
// ═══════════════════════════════════════════════════════

const JWT_SECRET  = process.env.JWT_SECRET  || "porla_dev_secret_change_me";
const JWT_EXPIRES = process.env.JWT_EXPIRES || "30d";

const signToken = (id) => jwt.sign({ id }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

const sendToken = (res, user, status = 200, message = "OK") =>
  res.status(status).json({ success: true, message, token: signToken(user._id), user: user.toPublicJSON() });

// ✅ TUZATILDI: isBlocked tekshiruvi qo'shildi
const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer "))
      return res.status(401).json({ success: false, message: "Kirish uchun tizimga kiring" });

    const decoded = jwt.verify(header.split(" ")[1], JWT_SECRET);
    const user    = await User.findById(decoded.id);
    if (!user)
      return res.status(401).json({ success: false, message: "Foydalanuvchi topilmadi" });
    if (user.isBlocked)
      return res.status(403).json({ success: false, message: "Hisobingiz bloklangan. Murojaat: support@porla.uz" });

    req.user = user;

    // ✅ Pro muddati o'tgan bo'lsa — avtomatik o'chirish
    if (user.isPro && user.proExpiresAt && new Date(user.proExpiresAt) < new Date()) {
      user.isPro        = false;
      user.proExpiresAt = null;
      await user.save({ validateBeforeSave: false });
      await Notification.create({
        userId:  user._id,
        title:   "Pro rejim muddati tugadi",
        message: "Pro rejiminiz muddati tugadi. Yangilash uchun profil bo'limiga o'ting.",
        type:    "warning",
      }).catch(() => {});
    }

    next();
  } catch (err) {
    if (err.name === "JsonWebTokenError")
      return res.status(401).json({ success: false, message: "Token noto'g'ri" });
    if (err.name === "TokenExpiredError")
      return res.status(401).json({ success: false, message: "Token muddati tugagan, qayta kiring" });
    next(err);
  }
};

// ✅ YANGI: admin tekshiruvi
const requireAdmin = (req, res, next) => {
  if (!req.user?.isAdmin)
    return res.status(403).json({ success: false, message: "Admin huquqi talab qilinadi" });
  next();
};

// ═══════════════════════════════════════════════════════
//                    AUTH ROUTES
// ═══════════════════════════════════════════════════════

const authRouter = express.Router();

authRouter.post("/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: "Barcha maydonlar to'ldirilishi shart" });
    if (password.length < 6)
      return res.status(400).json({ success: false, message: "Parol kamida 6 ta belgi bo'lishi kerak" });
    if (await User.findOne({ email: email.toLowerCase() }))
      return res.status(409).json({ success: false, message: "Bu email allaqachon ro'yxatdan o'tgan" });

    const user = await User.create({ name, email, password });
    await Notification.create({
      userId: user._id, title: "Xush kelibsiz! 🌸",
      message: `Salom ${user.name}! Porla platformasiga xush kelibsiz. Birinchi darsni boshlang!`,
      type: "achievement",
    });
    sendToken(res, user, 201, "Muvaffaqiyatli ro'yxatdan o'tdingiz");
  } catch (err) { next(err); }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: "Email va parol talab qilinadi" });

    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ success: false, message: "Email yoki parol noto'g'ri" });
    // ✅ Login paytida ham bloklash tekshiruvi
    if (user.isBlocked)
      return res.status(403).json({ success: false, message: "Hisobingiz bloklangan. Murojaat: support@porla.uz" });

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });
    sendToken(res, user, 200, "Tizimga muvaffaqiyatli kirdingiz");
  } catch (err) { next(err); }
});

authRouter.get("/me", protect, (req, res) => {
  const u = req.user.toPublicJSON();
  if (u.isPro && u.proExpiresAt) {
    const msLeft    = new Date(u.proExpiresAt) - new Date();
    u.proDaysLeft   = Math.max(0, Math.ceil(msLeft / 86400000));
    u.proExpired    = msLeft < 0;
  }
  res.json({ success: true, user: u });
});

authRouter.post("/logout", protect, (req, res) =>
  res.json({ success: true, message: "Tizimdan chiqdingiz" })
);

authRouter.patch("/update-profile", protect, async (req, res, next) => {
  try {
    const { name, avatar } = req.body;
    const update = {};
    if (name)   update.name   = name;
    if (avatar) update.avatar = avatar;
    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true, runValidators: true });
    res.json({ success: true, message: "Profil yangilandi", user: user.toPublicJSON() });
  } catch (err) { next(err); }
});

authRouter.patch("/change-password", protect, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ success: false, message: "Joriy va yangi parol talab qilinadi" });
    if (newPassword.length < 6)
      return res.status(400).json({ success: false, message: "Yangi parol kamida 6 ta belgi" });

    const user = await User.findById(req.user._id).select("+password");
    if (!(await user.comparePassword(currentPassword)))
      return res.status(400).json({ success: false, message: "Joriy parol noto'g'ri" });

    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: "Parol muvaffaqiyatli o'zgartirildi" });
  } catch (err) { next(err); }
});

app.use("/api/auth", authRouter);

// ═══════════════════════════════════════════════════════
//                   COURSE ROUTES
// ═══════════════════════════════════════════════════════

const courseRouter = express.Router();

courseRouter.get("/", protect, async (req, res, next) => {
  try {
    const courses = await Course.find({ isActive: true }).sort("order");
    const result  = await Promise.all(courses.map(async (c) => {
      const lessonCount = await Lesson.countDocuments({ courseId: c._id, isActive: true });
      return { ...c.toObject(), lessonCount, isLocked: c.isPro && !req.user.isPro && !req.user.isAdmin };
    }));
    res.json({ success: true, courses: result });
  } catch (err) { next(err); }
});

courseRouter.get("/:id", protect, async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: "Kurs topilmadi" });
    if (course.isPro && !req.user.isPro && !req.user.isAdmin)
      return res.status(403).json({ success: false, message: "Bu kurs Pro foydalanuvchilar uchun", isPro: true });

    const lessons      = await Lesson.find({ courseId: course._id, isActive: true }).sort("order");
    const completedIds = req.user.completedLessons.map(id => id.toString());
    const isUserPro    = req.user.isPro || req.user.isAdmin;
    const withProgress = lessons.map((l, idx) => {
      const obj        = l.toObject();
      const isCompleted= completedIds.includes(l._id.toString());
      // 1-dars (idx===0) har doim bepul; qolganlar Pro bo'lmasa locked
      const isLocked   = idx > 0 && !isUserPro;
      return {
        ...obj,
        isCompleted,
        isLocked,
        // Locked dars uchun mazmun va video qaytarilmaydi
        content:  isLocked ? "" : obj.content,
        videoUrl: isLocked ? "" : obj.videoUrl,
      };
    });
    res.json({ success: true, course, lessons: withProgress });
  } catch (err) { next(err); }
});

// Bitta darsni olish — GET /courses/:courseId/lessons/:lessonId
courseRouter.get("/:courseId/lessons/:lessonId", protect, async (req, res, next) => {
  try {
    const lesson = await Lesson.findOne({
      _id: req.params.lessonId,
      courseId: req.params.courseId,
      isActive: true,
    });
    if (!lesson) return res.status(404).json({ success: false, message: "Dars topilmadi" });

    // Kurs ichidagi barcha darslar (tartib bilan)
    const allLessons = await Lesson.find({ courseId: req.params.courseId, isActive: true }).sort("order");
    const idx        = allLessons.findIndex(l => l._id.toString() === lesson._id.toString());
    const isUserPro  = req.user.isPro || req.user.isAdmin;

    // 0-indeks (1-dars) bepul, qolganlari locked
    if (idx > 0 && !isUserPro)
      return res.status(403).json({ success: false, message: "Bu dars Pro foydalanuvchilar uchun", isPro: true });

    const completedIds = req.user.completedLessons.map(id => id.toString());
    const isCompleted  = completedIds.includes(lesson._id.toString());

    // Keyingi dars (lock holati bilan)
    const nextRaw  = allLessons[idx + 1] || null;
    const nextLesson = nextRaw ? {
      _id:      nextRaw._id,
      title:    nextRaw.title,
      duration: nextRaw.duration,
      order:    nextRaw.order,
      isLocked: (idx + 1) > 0 && !isUserPro,
      isCompleted: completedIds.includes(nextRaw._id.toString()),
    } : null;

    // Oldingi dars
    const prevRaw  = allLessons[idx - 1] || null;
    const prevLesson = prevRaw ? {
      _id:      prevRaw._id,
      title:    prevRaw.title,
      duration: prevRaw.duration,
      order:    prevRaw.order,
    } : null;

    res.json({
      success: true,
      lesson: { ...lesson.toObject(), isCompleted },
      navigation: {
        current:  idx + 1,
        total:    allLessons.length,
        prevLesson,
        nextLesson,
      },
    });
  } catch (err) { next(err); }
});

// Darsni yakunlash — POST /courses/:courseId/lessons/:lessonId/complete
// Response: completedCount + nextLesson (keyingi dars ma'lumoti)
courseRouter.post("/:courseId/lessons/:lessonId/complete", protect, async (req, res, next) => {
  try {
    const lesson = await Lesson.findOne({
      _id: req.params.lessonId,
      courseId: req.params.courseId,
      isActive: true,
    });
    if (!lesson) return res.status(404).json({ success: false, message: "Dars topilmadi" });

    // Pro tekshiruv
    const allLessons = await Lesson.find({ courseId: req.params.courseId, isActive: true }).sort("order");
    const idx        = allLessons.findIndex(l => l._id.toString() === lesson._id.toString());
    const isUserPro  = req.user.isPro || req.user.isAdmin;
    if (idx > 0 && !isUserPro)
      return res.status(403).json({ success: false, message: "Bu dars Pro foydalanuvchilar uchun" });

    // Yakunlash
    const already = req.user.completedLessons.some(id => id.toString() === lesson._id.toString());
    if (!already) {
      req.user.completedLessons.push(lesson._id);
      await req.user.save({ validateBeforeSave: false });

      // Har 5 ta darsda yutuq bildirishnomasi
      const count = req.user.completedLessons.length;
      if (count % 5 === 0) {
        await Notification.create({
          userId:  req.user._id,
          title:   `🏆 ${count} ta dars tugallandi!`,
          message: `Ajoyib! Siz ${count} ta darsni tugalladingiz. Shunday davom eting!`,
          type:    "achievement",
        }).catch(() => {});
      }
    }

    // Keyingi dars
    const completedIds = req.user.completedLessons.map(id => id.toString());
    const nextRaw      = allLessons[idx + 1] || null;
    const nextLesson   = nextRaw ? {
      _id:        nextRaw._id,
      title:      nextRaw.title,
      duration:   nextRaw.duration,
      order:      nextRaw.order,
      isLocked:   (idx + 1) > 0 && !isUserPro,
      isCompleted: completedIds.includes(nextRaw._id.toString()),
    } : null;

    // Kurs tugadi?
    const courseCompleted = !nextRaw;
    if (courseCompleted && !already) {
      await Notification.create({
        userId:  req.user._id,
        title:   "🎓 Kurs tugallandi!",
        message: `Tabriklaymiz! Siz "${lesson.courseId}" kursini to'liq tugatdingiz.`,
        type:    "achievement",
      }).catch(() => {});
    }

    res.json({
      success: true,
      message: courseCompleted ? "Kurs tugallandi! 🎓" : "Dars tugallandi! 🎉",
      completedCount: req.user.completedLessons.length,
      courseCompleted,
      nextLesson,       // null → oxirgi dars edi
    });
  } catch (err) { next(err); }
});

app.use("/api/courses", courseRouter);

// ═══════════════════════════════════════════════════════
//                  TRACKER ROUTES
// ═══════════════════════════════════════════════════════

const trackerRouter = express.Router();

trackerRouter.get("/today", protect, async (req, res, next) => {
  try {
    const cycle = await Cycle.findOne({ userId: req.user._id }).sort({ startDate: -1 });
    if (!cycle) return res.json({ success: true, data: null });

    const today         = new Date(); today.setHours(0,0,0,0);
    const dayOfCycle    = Math.floor((Date.now() - cycle.startDate) / 86400000) + 1;
    const daysUntilNext = Math.max(0, cycle.cycleLength - dayOfCycle);
    const todaySymptoms = cycle.symptoms.find(s => s.date.toDateString() === today.toDateString()) || null;
    res.json({ success: true, data: { dayOfCycle, daysUntilNext, cycleLength: cycle.cycleLength, todaySymptoms, cycleStartDate: cycle.startDate } });
  } catch (err) { next(err); }
});

trackerRouter.get("/cycles", protect, async (req, res, next) => {
  try {
    const cycles = await Cycle.find({ userId: req.user._id }).sort({ startDate: -1 }).limit(12);
    let nextPeriod = null;
    if (cycles.length) {
      const avgLen = Math.round(cycles.slice(0,3).reduce((s,c) => s + c.cycleLength, 0) / Math.min(cycles.length,3));
      nextPeriod   = new Date(cycles[0].startDate);
      nextPeriod.setDate(nextPeriod.getDate() + avgLen);
    }
    res.json({ success: true, cycles, nextPeriod });
  } catch (err) { next(err); }
});

trackerRouter.post("/cycles", protect, async (req, res, next) => {
  try {
    const { startDate, cycleLength = 28, notes = "" } = req.body;
    if (!startDate) return res.status(400).json({ success: false, message: "Boshlanish sanasi majburiy" });
    const cycle = await Cycle.create({ userId: req.user._id, startDate: new Date(startDate), cycleLength, notes });
    res.status(201).json({ success: true, message: "Tsikl saqlandi", cycle });
  } catch (err) { next(err); }
});

trackerRouter.patch("/cycles/:id", protect, async (req, res, next) => {
  try {
    const cycle = await Cycle.findOne({ _id: req.params.id, userId: req.user._id });
    if (!cycle) return res.status(404).json({ success: false, message: "Tsikl topilmadi" });
    const { endDate, cycleLength, notes, symptoms } = req.body;
    if (endDate)     cycle.endDate     = new Date(endDate);
    if (cycleLength) cycle.cycleLength = cycleLength;
    if (notes)       cycle.notes       = notes;
    if (symptoms)    cycle.symptoms    = symptoms;
    await cycle.save();
    res.json({ success: true, message: "Tsikl yangilandi", cycle });
  } catch (err) { next(err); }
});

trackerRouter.post("/symptoms", protect, async (req, res, next) => {
  try {
    const { date, items = [], mood = "", painLevel = 0, notes = "" } = req.body;
    if (!date) return res.status(400).json({ success: false, message: "Sana majburiy" });
    const cycle = await Cycle.findOne({ userId: req.user._id }).sort({ startDate: -1 });
    if (!cycle) return res.status(404).json({ success: false, message: "Avval tsikl boshlang" });
    const d   = new Date(date);
    const idx = cycle.symptoms.findIndex(s => s.date.toDateString() === d.toDateString());
    if (idx >= 0) cycle.symptoms[idx] = { date: d, items, mood, painLevel, notes };
    else          cycle.symptoms.push({ date: d, items, mood, painLevel, notes });
    await cycle.save();
    res.json({ success: true, message: "Belgilar saqlandi" });
  } catch (err) { next(err); }
});

app.use("/api/tracker", trackerRouter);

// ═══════════════════════════════════════════════════════
//               NOTIFICATION ROUTES
// ═══════════════════════════════════════════════════════

const notifRouter = express.Router();

notifRouter.get("/", protect, async (req, res, next) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(20);
    const unreadCount   = await Notification.countDocuments({ userId: req.user._id, isRead: false });
    res.json({ success: true, notifications, unreadCount });
  } catch (err) { next(err); }
});
notifRouter.patch("/:id/read", protect, async (req, res, next) => {
  try {
    await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, { isRead: true });
    res.json({ success: true });
  } catch (err) { next(err); }
});
notifRouter.patch("/read-all", protect, async (req, res, next) => {
  try {
    await Notification.updateMany({ userId: req.user._id }, { isRead: true });
    res.json({ success: true, message: "Hammasi o'qildi" });
  } catch (err) { next(err); }
});

app.use("/api/notifications", notifRouter);

// ═══════════════════════════════════════════════════════
//                   Q&A (Anon savollar)
// ═══════════════════════════════════════════════════════
const qnaRouter = express.Router();

// Anonim savol yuborish (public)
qnaRouter.post("/questions", qnaSubmitLimiter, async (req, res, next) => {
  try {
    const { question, topic = "", askedName = "", contact = "" } = req.body || {};
    if (!question || typeof question !== "string" || question.trim().length < 5)
      return res.status(400).json({ success: false, message: "Savol kamida 5 ta belgi bo'lishi kerak" });

    const doc = await Qna.create({
      question: question.trim(),
      topic: topic.trim(),
      askedName: askedName.trim(),
      contact: contact.trim(),
      askedIp: (req.headers["x-forwarded-for"] || req.ip || "").toString(),
    });
    res.status(201).json({ success: true, message: "Savolingiz yuborildi! Adminlar tez orada ko'rib chiqadi.", id: doc._id });
  } catch (err) { next(err); }
});

// Barcha uchun ko'rinadigan (nashr etilgan) Q&A ro'yxati (public)
qnaRouter.get("/public", async (req, res, next) => {
  try {
    const page   = parseInt(req.query.page)  || 1;
    const limit  = Math.min(parseInt(req.query.limit) || 20, 50);
    const search = (req.query.search || "").trim();
    const topic  = (req.query.topic  || "").trim();

    const query = { isPublished: true, status: "answered" };
    if (search) query.question = { $regex: search, $options: "i" };
    if (topic)  query.topic    = { $regex: `^${topic}$`, $options: "i" };

    const [items, total] = await Promise.all([
      Qna.find(query).sort({ answeredAt: -1, updatedAt: -1 }).skip((page-1)*limit).limit(limit)
        .select("question answer topic answeredAt updatedAt"),
      Qna.countDocuments(query),
    ]);

    res.json({ success: true, items, pagination: { page, limit, total, pages: Math.ceil(total/limit) } });
  } catch (err) { next(err); }
});

// Bitta nashr etilgan Q&A (public)
qnaRouter.get("/public/:id", async (req, res, next) => {
  try {
    const item = await Qna.findOne({ _id: req.params.id, isPublished: true, status: "answered" })
      .select("question answer topic answeredAt updatedAt");
    if (!item) return res.status(404).json({ success: false, message: "Savol topilmadi yoki hali nashr etilmagan" });
    res.json({ success: true, item });
  } catch (err) { next(err); }
});

app.use("/api/qna", qnaRouter);

// ═══════════════════════════════════════════════════════
//              KUNLIK MASLAHATLAR (PUBLIC)
// ═══════════════════════════════════════════════════════
const tipRouter = express.Router();

// Bugungi maslahat — token shart emas, barcha ko'ra oladi
tipRouter.get("/today", async (req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

    // 1) Avval bugungi sanaga tegishli maslahat bormi?
    let tip = await DailyTip.findOne({ isActive: true, publishDate: today });

    // 2) Yo'q bo'lsa — publishDate bo'sh (har kuni navbat bilan) maslahatlardan birini tanlaymiz
    //    Deterministik: kун raqami % maslahatlar soni
    if (!tip) {
      const general = await DailyTip.find({ isActive: true, publishDate: "" });
      if (general.length) {
        const dayIndex = Math.floor(Date.now() / 86400000); // epoch days
        tip = general[dayIndex % general.length];
      }
    }

    if (!tip) return res.json({ success: true, tip: null });
    res.json({ success: true, tip: { _id: tip._id, content: tip.content, category: tip.category, emoji: tip.emoji } });
  } catch (err) { next(err); }
});

// Barcha faol maslahatlar ro'yxati (public)
tipRouter.get("/", async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const page  = parseInt(req.query.page) || 1;
    const cat   = req.query.category || "";

    const query = { isActive: true };
    if (cat) query.category = cat;

    const [tips, total] = await Promise.all([
      DailyTip.find(query).sort({ publishDate: -1, createdAt: -1 }).skip((page-1)*limit).limit(limit)
        .select("content category emoji publishDate"),
      DailyTip.countDocuments(query),
    ]);
    res.json({ success: true, tips, pagination: { page, limit, total, pages: Math.ceil(total/limit) } });
  } catch (err) { next(err); }
});

app.use("/api/tips", tipRouter);

// ═══════════════════════════════════════════════════════
//          ✅ YANGI: BIRINCHI ADMIN YARATISH
//   Faqat bir marta ishlatiladi — keyin o'chirib tashlash mumkin
// ═══════════════════════════════════════════════════════

app.post("/api/create-admin", async (req, res) => {
  try {
    const key = req.headers["x-admin-key"];
    if (key !== (process.env.ADMIN_KEY || "porla_admin_2024"))
      return res.status(403).json({ success: false, message: "Ruxsat yo'q" });

    if (await User.findOne({ isAdmin: true }))
      return res.status(409).json({ success: false, message: "Admin allaqon mavjud" });

    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: "Ism, email va parol talab qilinadi" });

    const admin = await User.create({ name, email, password, isAdmin: true, isPro: true });
    res.status(201).json({ success: true, message: "Admin yaratildi", user: admin.toPublicJSON() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════
//              ✅ YANGI: ADMIN ROUTES
// ═══════════════════════════════════════════════════════

const adminRouter = express.Router();
adminRouter.use(protect, requireAdmin); // barcha admin route'lar himoyalangan

/* ── Dashboard statistika ── */
adminRouter.get("/stats", async (req, res, next) => {
  try {
    const [totalUsers, proUsers, totalCourses, totalLessons,
           newUsersToday, newUsersThisWeek, newUsersThisMonth, totalCycles] =
      await Promise.all([
        User.countDocuments(),
        User.countDocuments({ isPro: true }),
        Course.countDocuments({ isActive: true }),
        Lesson.countDocuments({ isActive: true }),
        User.countDocuments({ createdAt: { $gte: new Date(new Date().setHours(0,0,0,0)) } }),
        User.countDocuments({ createdAt: { $gte: new Date(Date.now() - 7  * 86400000) } }),
        User.countDocuments({ createdAt: { $gte: new Date(Date.now() - 30 * 86400000) } }),
        Cycle.countDocuments(),
      ]);

    // ✅ YANGI: 7 kun ichida Pro muddati tugaydigan foydalanuvchilar
    const expiringProUsers = await User.countDocuments({
      isPro: true,
      proExpiresAt: { $gte: new Date(), $lte: new Date(Date.now() + 7 * 86400000) },
    });

    const last7days = await Promise.all(
      Array.from({ length: 7 }, (_, i) => {
        const d     = new Date();
        d.setDate(d.getDate() - (6 - i));
        const start = new Date(d.setHours(0,0,0,0));
        const end   = new Date(d.setHours(23,59,59,999));
        return User.countDocuments({ createdAt: { $gte: start, $lte: end } })
          .then(count => ({ date: start.toLocaleDateString("uz-UZ", { month:"short", day:"numeric" }), count }));
      })
    );

    res.json({
      success: true,
      stats: {
        totalUsers, proUsers, freeUsers: totalUsers - proUsers,
        totalCourses, totalLessons,
        newUsersToday, newUsersThisWeek, newUsersThisMonth,
        totalCycles, last7days,
        proPercentage: totalUsers > 0 ? Math.round((proUsers / totalUsers) * 100) : 0,
        expiringProUsers,   // ✅ YANGI: 7 kun ichida muddati tugaydigan Pro
      },
    });
  } catch (err) { next(err); }
});

/* ── Foydalanuvchilar ro'yxati (qidiruv + filter + pagination) ── */
adminRouter.get("/users", async (req, res, next) => {
  try {
    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 20;
    const search = req.query.search || "";
    const filter = req.query.filter || "all";

    const query = {};
    if (search) query.$or = [
      { name:  { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
    if (filter === "pro")  query.isPro = true;
    if (filter === "free") query.isPro = false;

    const [users, total] = await Promise.all([
      User.find(query).select("-password").sort({ createdAt: -1 }).skip((page-1)*limit).limit(limit),
      User.countDocuments(query),
    ]);

    // Pro tugash muddati va qolgan kunlar
    const now = new Date();
    const enriched = users.map(u => {
      const obj = u.toObject();
      if (obj.isPro && obj.proExpiresAt) {
        const msLeft = new Date(obj.proExpiresAt) - now;
        obj.proDaysLeft = Math.max(0, Math.ceil(msLeft / 86400000));
        obj.proExpired  = msLeft < 0;
      }
      return obj;
    });

    res.json({
      success: true, users: enriched,
      pagination: { page, limit, total, pages: Math.ceil(total/limit), hasNext: page*limit < total, hasPrev: page > 1 },
    });
  } catch (err) { next(err); }
});

/* ── Bitta foydalanuvchi ── */
adminRouter.get("/users/:id", async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ success: false, message: "Foydalanuvchi topilmadi" });
    const cycles = await Cycle.find({ userId: user._id }).sort({ startDate: -1 }).limit(5);

    // Pro qolgan kunlar
    const obj = user.toObject();
    if (obj.isPro && obj.proExpiresAt) {
      const msLeft = new Date(obj.proExpiresAt) - new Date();
      obj.proDaysLeft = Math.max(0, Math.ceil(msLeft / 86400000));
      obj.proExpired  = msLeft < 0;
    }

    res.json({ success: true, user: obj, cycles });
  } catch (err) { next(err); }
});

/* ── Pro berish / olish ── */
adminRouter.patch("/users/:id/pro", async (req, res, next) => {
  try {
    const { isPro, months = 1 } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "Foydalanuvchi topilmadi" });

    user.isPro = isPro;
    if (isPro) {
      const exp = new Date();
      exp.setMonth(exp.getMonth() + months);
      user.proExpiresAt = exp;
    } else {
      user.proExpiresAt = null;
    }
    await user.save({ validateBeforeSave: false });

    await Notification.create({
      userId:  user._id,
      title:   isPro ? "Pro rejim faollashtirildi! ✦" : "Pro rejim o'chirildi",
      message: isPro
        ? `Tabriklaymiz! Sizga ${months} oylik Pro rejim berildi.`
        : "Pro rejiminiz o'chirildi. Bepul kurslar bilan davom etishingiz mumkin.",
      type: isPro ? "achievement" : "info",
    });

    res.json({ success: true, message: isPro ? `Pro ${months} oyga berildi` : "Pro o'chirildi", user: user.toPublicJSON() });
  } catch (err) { next(err); }
});

/* ── Bloklash / blokdan chiqarish ── */
adminRouter.patch("/users/:id/block", async (req, res, next) => {
  try {
    const { isBlocked } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { isBlocked }, { returnDocument: 'after' }).select("-password");
    if (!user) return res.status(404).json({ success: false, message: "Foydalanuvchi topilmadi" });
    res.json({ success: true, message: isBlocked ? "Bloklandi" : "Blokdan chiqarildi", user });
  } catch (err) { next(err); }
});

/* ── O'chirish ── */
adminRouter.delete("/users/:id", async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "Foydalanuvchi topilmadi" });
    if (user.isAdmin) return res.status(403).json({ success: false, message: "Admin o'chirilmaydi" });
    await Promise.all([
      User.findByIdAndDelete(req.params.id),
      Cycle.deleteMany({ userId: req.params.id }),
      Notification.deleteMany({ userId: req.params.id }),
    ]);
    res.json({ success: true, message: "Foydalanuvchi o'chirildi" });
  } catch (err) { next(err); }
});

/* ── Bitta foydalanuvchiga bildirishnoma ── */
adminRouter.post("/users/:id/notify", async (req, res, next) => {
  try {
    const { title, message, type = "info" } = req.body;
    if (!title || !message)
      return res.status(400).json({ success: false, message: "Sarlavha va xabar kerak" });
    await Notification.create({ userId: req.params.id, title, message, type });
    res.json({ success: true, message: "Bildirishnoma yuborildi" });
  } catch (err) { next(err); }
});

/* ── Broadcast — barcha / Pro ── */
adminRouter.post("/broadcast", async (req, res, next) => {
  try {
    const { title, message, type = "info", onlyPro = false } = req.body;
    if (!title || !message)
      return res.status(400).json({ success: false, message: "Sarlavha va xabar kerak" });
    const users = await User.find(onlyPro ? { isPro: true } : {}).select("_id");
    await Notification.insertMany(users.map(u => ({ userId: u._id, title, message, type })));
    res.json({ success: true, message: `${users.length} ta foydalanuvchiga yuborildi` });
  } catch (err) { next(err); }
});

/* ── Kurslar (admin ko'rinishi) ── */
adminRouter.get("/courses", async (req, res, next) => {
  try {
    const courses = await Course.find().sort("order");
    const result  = await Promise.all(courses.map(async c => ({
      ...c.toObject(),
      lessonCount: await Lesson.countDocuments({ courseId: c._id }),
    })));
    res.json({ success: true, courses: result });
  } catch (err) { next(err); }
});

adminRouter.post("/courses", async (req, res, next) => {
  try {
    const { title, description, icon, color, bgColor, isPro, order } = req.body;
    if (!title || !description)
      return res.status(400).json({ success: false, message: "Sarlavha va tavsif majburiy" });
    const course = await Course.create({ title, description, icon, color, bgColor, isPro, order });
    res.status(201).json({ success: true, message: "Kurs qo'shildi", course });
  } catch (err) { next(err); }
});

adminRouter.patch("/courses/:id", async (req, res, next) => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!course) return res.status(404).json({ success: false, message: "Kurs topilmadi" });
    res.json({ success: true, message: "Kurs yangilandi", course });
  } catch (err) { next(err); }
});

adminRouter.delete("/courses/:id", async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: "Kurs topilmadi" });
    await Promise.all([
      Course.findByIdAndDelete(req.params.id),
      Lesson.deleteMany({ courseId: req.params.id }),
    ]);
    res.json({ success: true, message: "Kurs va darslari o'chirildi" });
  } catch (err) { next(err); }
});

/* ── Darslar ── */
adminRouter.get("/courses/:courseId/lessons", async (req, res, next) => {
  try {
    const lessons = await Lesson.find({ courseId: req.params.courseId }).sort("order");
    res.json({ success: true, lessons });
  } catch (err) { next(err); }
});

adminRouter.post("/courses/:courseId/lessons", async (req, res, next) => {
  try {
    const { title, content, videoUrl, duration, order, isPro } = req.body;
    if (!title || !content)
      return res.status(400).json({ success: false, message: "Sarlavha va mazmun majburiy" });
    const course = await Course.findById(req.params.courseId);
    if (!course) return res.status(404).json({ success: false, message: "Kurs topilmadi" });
    const lesson = await Lesson.create({
      courseId: req.params.courseId, title, content,
      videoUrl, duration, order, isPro: isPro ?? course.isPro,
    });
    res.status(201).json({ success: true, message: "Dars qo'shildi", lesson });
  } catch (err) { next(err); }
});

adminRouter.patch("/courses/:courseId/lessons/:id", async (req, res, next) => {
  try {
    const lesson = await Lesson.findOneAndUpdate(
      { _id: req.params.id, courseId: req.params.courseId },
      req.body, { returnDocument: 'after', runValidators: true }
    );
    if (!lesson) return res.status(404).json({ success: false, message: "Dars topilmadi" });
    res.json({ success: true, message: "Dars yangilandi", lesson });
  } catch (err) { next(err); }
});

adminRouter.delete("/courses/:courseId/lessons/:id", async (req, res, next) => {
  try {
    const lesson = await Lesson.findOneAndDelete({ _id: req.params.id, courseId: req.params.courseId });
    if (!lesson) return res.status(404).json({ success: false, message: "Dars topilmadi" });
    res.json({ success: true, message: "Dars o'chirildi" });
  } catch (err) { next(err); }
});

/* ── Seed ── */
adminRouter.post("/seed", async (req, res, next) => {
  try {
    if (await Course.countDocuments() > 0)
      return res.json({ success: true, message: "Ma'lumotlar allaqon mavjud" });

    const courses = await Course.insertMany([
      { title: "Ayollar reproduktiv tizimi",           description: "Reproduktiv organlar, ularning vazifalari va asosiy tushunchalar.", icon: "🩺", color: "#3b7de8", bgColor: "#eff6ff", isPro: false, order: 1 },
      { title: "Hayz sikli",                           description: "Normal tsikl, uning fazalari, ta'sir etuvchi omillar va kuzatish.",  icon: "🌸", color: "#d64f6e", bgColor: "#fde8ec", isPro: false, order: 2 },
      { title: "Ayol gormonlari salomatlikdagi o'rni", description: "Gormonlar, ularning muvozanati va sog'liqqa ta'siri.",               icon: "⚗️", color: "#8657d6", bgColor: "#f3f0ff", isPro: true,  order: 3 },
      { title: "Vaginal ajralmalar",                   description: "Normal va g'ayri-normal ajralmalarni farqlash.",                     icon: "💧", color: "#0891b2", bgColor: "#ecfeff", isPro: true,  order: 4 },
      { title: "Anemiya",                              description: "Temir tanqisligi, belgilari, sabablari va davolash usullari.",           icon: "🩸", color: "#dc2626", bgColor: "#fef2f2", isPro: true,  order: 5 },
    ]);
    const lessons = [];
    courses.forEach(c => {
      for (let i = 1; i <= (c.isPro ? 3 : 2); i++)
        lessons.push({ courseId: c._id, title: `${c.title} — ${i}-dars`, content: `Bu ${c.title} kursining ${i}-darsi.`, duration: 10+i*5, order: i, isPro: c.isPro });
    });
    await Lesson.insertMany(lessons);
    res.json({ success: true, message: "Seed data qo'shildi", courses: courses.length, lessons: lessons.length });
  } catch (err) { next(err); }
});

app.use("/api/admin", adminRouter);

// ✅ Q&A (Anon savollar) — Admin
adminRouter.get("/qna/questions", async (req, res, next) => {
  try {
    const page    = parseInt(req.query.page)  || 1;
    const limit   = Math.min(parseInt(req.query.limit) || 20, 100);
    const status  = (req.query.status || "").trim();
    const pub     = (req.query.published || "").trim();
    const search  = (req.query.search || "").trim();

    const query = {};
    if (status === "pending" || status === "answered") query.status = status;
    if (pub === "true")  query.isPublished = true;
    if (pub === "false") query.isPublished = false;
    if (search) query.question = { $regex: search, $options: "i" };

    const [items, total] = await Promise.all([
      Qna.find(query)
        .sort({ createdAt: -1 })
        .skip((page-1)*limit)
        .limit(limit)
        .populate("askedBy", "name email")
        .populate("answeredBy", "name email"),
      Qna.countDocuments(query),
    ]);

    res.json({ success: true, items, pagination: { page, limit, total, pages: Math.ceil(total/limit) } });
  } catch (err) { next(err); }
});

adminRouter.get("/qna/questions/:id", async (req, res, next) => {
  try {
    const item = await Qna.findById(req.params.id)
      .populate("askedBy", "name email")
      .populate("answeredBy", "name email");
    if (!item) return res.status(404).json({ success: false, message: "Savol topilmadi" });
    res.json({ success: true, item });
  } catch (err) { next(err); }
});

adminRouter.patch("/qna/questions/:id/answer", async (req, res, next) => {
  try {
    const { answer = "", isPublished } = req.body || {};
    if (!answer || answer.trim().length < 3)
      return res.status(400).json({ success: false, message: "Javob kamida 3 ta belgi bo'lishi kerak" });

    const item = await Qna.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Savol topilmadi" });

    item.answer      = answer.trim();
    item.status      = "answered";
    item.answeredBy  = req.user._id;
    item.answeredAt  = new Date();
    if (typeof isPublished === "boolean") item.isPublished = isPublished;
    await item.save();

    if (item.askedBy) {
      await Notification.create({
        userId: item.askedBy,
        title:  "Savolingizga javob berildi",
        message: `Savolingizga javob tayyor. Mavzu: ${item.topic || "Umumiy"}.`,
        type:   "info",
      }).catch(() => {});
    }

    res.json({ success: true, message: "Javob saqlandi", item });
  } catch (err) { next(err); }
});

adminRouter.patch("/qna/questions/:id/publish", async (req, res, next) => {
  try {
    const { isPublished } = req.body || {};
    if (typeof isPublished !== "boolean")
      return res.status(400).json({ success: false, message: "isPublished boolean bo'lishi kerak" });
    const item = await Qna.findByIdAndUpdate(req.params.id, { isPublished }, { returnDocument: 'after' });
    if (!item) return res.status(404).json({ success: false, message: "Savol topilmadi" });
    res.json({ success: true, message: isPublished ? "Nashr etildi" : "Nashrdan olindi", item });
  } catch (err) { next(err); }
});

adminRouter.delete("/qna/questions/:id", async (req, res, next) => {
  try {
    const item = await Qna.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Savol topilmadi" });
    res.json({ success: true, message: "Savol o'chirildi" });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════
//        ✅ ADMIN — KUNLIK MASLAHATLAR BOSHQARUVI
// ═══════════════════════════════════════════════════════

/* Barcha maslahatlar ro'yxati */
adminRouter.get("/tips", async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 30, 100);
    const cat   = req.query.category || "";

    const query = {};
    if (cat) query.category = cat;

    const [tips, total] = await Promise.all([
      DailyTip.find(query).sort({ publishDate: -1, createdAt: -1 })
        .skip((page-1)*limit).limit(limit)
        .populate("createdBy", "name"),
      DailyTip.countDocuments(query),
    ]);
    res.json({ success: true, tips, pagination: { page, limit, total, pages: Math.ceil(total/limit) } });
  } catch (err) { next(err); }
});

/* Yangi maslahat qo'shish */
adminRouter.post("/tips", async (req, res, next) => {
  try {
    const { content, category = "umumiy", emoji = "💡", publishDate = "", isActive = true } = req.body;
    if (!content || content.trim().length < 5)
      return res.status(400).json({ success: false, message: "Maslahat matni kamida 5 ta belgi" });

    // publishDate format tekshirish
    if (publishDate && !/^\d{4}-\d{2}-\d{2}$/.test(publishDate))
      return res.status(400).json({ success: false, message: "publishDate formati: YYYY-MM-DD" });

    const tip = await DailyTip.create({
      content: content.trim(), category, emoji, publishDate, isActive,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, message: "Maslahat qo'shildi", tip });
  } catch (err) { next(err); }
});

/* Maslahatni tahrirlash */
adminRouter.patch("/tips/:id", async (req, res, next) => {
  try {
    const allowed = ["content","category","emoji","publishDate","isActive"];
    const update  = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });

    if (update.publishDate && !/^\d{4}-\d{2}-\d{2}$/.test(update.publishDate) && update.publishDate !== "")
      return res.status(400).json({ success: false, message: "publishDate formati: YYYY-MM-DD" });

    const tip = await DailyTip.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!tip) return res.status(404).json({ success: false, message: "Maslahat topilmadi" });
    res.json({ success: true, message: "Maslahat yangilandi", tip });
  } catch (err) { next(err); }
});

/* Maslahatni o'chirish */
adminRouter.delete("/tips/:id", async (req, res, next) => {
  try {
    const tip = await DailyTip.findByIdAndDelete(req.params.id);
    if (!tip) return res.status(404).json({ success: false, message: "Maslahat topilmadi" });
    res.json({ success: true, message: "Maslahat o'chirildi" });
  } catch (err) { next(err); }
});

// ─── Health check ────────────────────────────────────────
app.get("/api/health", (req, res) =>
  res.json({ success: true, service: "Porla Backend", version: "2.0.0",
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    time: new Date().toISOString() })
);

app.use((req, res) =>
  res.status(404).json({ success: false, message: `Route topilmadi: ${req.originalUrl}` })
);

// ✅ TUZATILDI: to'rtinchi parametr (next) qo'shildi
app.use((err, req, res, next) => {
  console.error("❌", err.message);
  if (err.name === "ValidationError") {
    const msg = Object.values(err.errors).map(e => e.message).join(", ");
    return res.status(400).json({ success: false, message: msg });
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(409).json({ success: false, message: `Bu ${field} allaqachon mavjud` });
  }
  if (err.name === "CastError")
    return res.status(400).json({ success: false, message: "Noto'g'ri ID format" });
  res.status(err.statusCode || 500).json({ success: false, message: err.message || "Server ichki xatosi" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🌸  Porla Backend — http://localhost:${PORT}`);
  console.log(`📋  Health: http://localhost:${PORT}/api/health\n`);
});

module.exports = app;