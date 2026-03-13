/**
 * ╔══════════════════════════════════════════════════════╗
 * ║           PORLA — Admin Routes                       ║
 * ║   Bu faylni server.js ga import qiling:              ║
 * ║   const adminRouter = require("./admin.routes");     ║
 * ║   app.use("/api/admin", adminRouter);                ║
 * ╚══════════════════════════════════════════════════════╝
 */

const express  = require("express");
const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");
const router   = express.Router();

// ── Models (server.js dagi modellar) ──────────────────
// Bu faylni server.js bilan birgalikda ishlatilganda
// modellar allaqachon ro'yxatdan o'tgan bo'ladi.
const User         = mongoose.model("User");
const Course       = mongoose.model("Course");
const Lesson       = mongoose.model("Lesson");
const Cycle        = mongoose.model("Cycle");
const Notification = mongoose.model("Notification");

// ── Admin middleware ───────────────────────────────────
// server.js dagi `protect` middleware ishlatiladi
// + foydalanuvchi admin ekanligini tekshiradi
const requireAdmin = (req, res, next) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({
      success: false,
      message: "Admin huquqi talab qilinadi",
    });
  }
  next();
};

// Barcha admin route'lar uchun admin tekshiruvi
router.use(requireAdmin);

// ═══════════════════════════════════════════════════════
//                   DASHBOARD STATS
// ═══════════════════════════════════════════════════════

/**
 * GET /api/admin/stats
 * Umumiy statistika
 */
router.get("/stats", async (req, res, next) => {
  try {
    const [
      totalUsers,
      proUsers,
      totalCourses,
      totalLessons,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
      totalCycles,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isPro: true }),
      Course.countDocuments({ isActive: true }),
      Lesson.countDocuments({ isActive: true }),
      User.countDocuments({ createdAt: { $gte: new Date(new Date().setHours(0,0,0,0)) } }),
      User.countDocuments({ createdAt: { $gte: new Date(Date.now() - 7 * 86400000) } }),
      User.countDocuments({ createdAt: { $gte: new Date(Date.now() - 30 * 86400000) } }),
      Cycle.countDocuments(),
    ]);

    // Oxirgi 7 kun — kunlik yangi foydalanuvchilar
    const last7days = await Promise.all(
      Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        const start = new Date(date.setHours(0,0,0,0));
        const end   = new Date(date.setHours(23,59,59,999));
        return User.countDocuments({ createdAt: { $gte: start, $lte: end } })
          .then(count => ({
            date: start.toLocaleDateString("uz-UZ", { month: "short", day: "numeric" }),
            count,
          }));
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
      },
    });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════
//                  USER MANAGEMENT
// ═══════════════════════════════════════════════════════

/**
 * GET /api/admin/users
 * Barcha foydalanuvchilar (pagination + qidiruv)
 */
router.get("/users", async (req, res, next) => {
  try {
    const page    = parseInt(req.query.page)  || 1;
    const limit   = parseInt(req.query.limit) || 20;
    const search  = req.query.search || "";
    const filter  = req.query.filter || "all"; // all | pro | free

    const query = {};
    if (search) {
      query.$or = [
        { name:  { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    if (filter === "pro")  query.isPro = true;
    if (filter === "free") query.isPro = false;

    const [users, total] = await Promise.all([
      User.find(query)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      User.countDocuments(query),
    ]);

    res.json({
      success: true,
      users,
      pagination: {
        page, limit, total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (err) { next(err); }
});

/**
 * GET /api/admin/users/:id
 * Bitta foydalanuvchi — to'liq ma'lumot
 */
router.get("/users/:id", async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ success: false, message: "Foydalanuvchi topilmadi" });

    const cycles = await Cycle.find({ userId: user._id }).sort({ startDate: -1 }).limit(5);

    res.json({ success: true, user, cycles });
  } catch (err) { next(err); }
});

/**
 * PATCH /api/admin/users/:id/pro
 * Pro berish yoki olish
 */
router.patch("/users/:id/pro", async (req, res, next) => {
  try {
    const { isPro, months = 1 } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "Foydalanuvchi topilmadi" });

    user.isPro = isPro;
    if (isPro) {
      const expires = new Date();
      expires.setMonth(expires.getMonth() + months);
      user.proExpiresAt = expires;
    } else {
      user.proExpiresAt = null;
    }
    await user.save({ validateBeforeSave: false });

    // Bildirishnoma yuborish
    await Notification.create({
      userId:  user._id,
      title:   isPro ? "Pro rejim faollashtirildi! ✦" : "Pro rejim o'chirildi",
      message: isPro
        ? `Tabriklaymiz! Sizga ${months} oylik Pro rejim berildi. Barcha kurslarga kirish oching!`
        : "Pro rejiminiz o'chirildi. Bepul kurslar bilan davom etishingiz mumkin.",
      type: isPro ? "achievement" : "info",
    });

    res.json({
      success: true,
      message: isPro ? `Pro rejim ${months} oyga berildi` : "Pro rejim o'chirildi",
      user: user.toPublicJSON(),
    });
  } catch (err) { next(err); }
});

/**
 * PATCH /api/admin/users/:id/block
 * Foydalanuvchini bloklash / blokdan chiqarish
 * (isBlocked field kerak — User schemaga qo'shish kerak)
 */
router.patch("/users/:id/block", async (req, res, next) => {
  try {
    const { isBlocked } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBlocked },
      { new: true }
    ).select("-password");
    if (!user) return res.status(404).json({ success: false, message: "Foydalanuvchi topilmadi" });

    res.json({
      success: true,
      message: isBlocked ? "Foydalanuvchi bloklandi" : "Foydalanuvchi blokdan chiqarildi",
      user,
    });
  } catch (err) { next(err); }
});

/**
 * DELETE /api/admin/users/:id
 * Foydalanuvchini o'chirish
 */
router.delete("/users/:id", async (req, res, next) => {
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

/**
 * POST /api/admin/users/:id/notify
 * Foydalanuvchiga bildirishnoma yuborish
 */
router.post("/users/:id/notify", async (req, res, next) => {
  try {
    const { title, message, type = "info" } = req.body;
    if (!title || !message) return res.status(400).json({ success: false, message: "Sarlavha va xabar talab qilinadi" });

    await Notification.create({ userId: req.params.id, title, message, type });
    res.json({ success: true, message: "Bildirishnoma yuborildi" });
  } catch (err) { next(err); }
});

/**
 * POST /api/admin/broadcast
 * Barcha foydalanuvchilarga bildirishnoma
 */
router.post("/broadcast", async (req, res, next) => {
  try {
    const { title, message, type = "info", onlyPro = false } = req.body;
    if (!title || !message) return res.status(400).json({ success: false, message: "Sarlavha va xabar talab qilinadi" });

    const query = onlyPro ? { isPro: true } : {};
    const users = await User.find(query).select("_id");

    await Notification.insertMany(
      users.map(u => ({ userId: u._id, title, message, type }))
    );

    res.json({ success: true, message: `${users.length} ta foydalanuvchiga yuborildi` });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════
//                  COURSE MANAGEMENT
// ═══════════════════════════════════════════════════════

/**
 * GET /api/admin/courses
 * Barcha kurslar (admin ko'rinishi)
 */
router.get("/courses", async (req, res, next) => {
  try {
    const courses = await Course.find().sort("order");
    const result  = await Promise.all(courses.map(async c => {
      const lessonCount = await Lesson.countDocuments({ courseId: c._id });
      return { ...c.toObject(), lessonCount };
    }));
    res.json({ success: true, courses: result });
  } catch (err) { next(err); }
});

/**
 * POST /api/admin/courses
 * Yangi kurs qo'shish
 */
router.post("/courses", async (req, res, next) => {
  try {
    const { title, description, icon, color, bgColor, isPro, order } = req.body;
    if (!title || !description) return res.status(400).json({ success: false, message: "Sarlavha va tavsif majburiy" });

    const course = await Course.create({ title, description, icon, color, bgColor, isPro, order });
    res.status(201).json({ success: true, message: "Kurs qo'shildi", course });
  } catch (err) { next(err); }
});

/**
 * PATCH /api/admin/courses/:id
 * Kursni tahrirlash
 */
router.patch("/courses/:id", async (req, res, next) => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!course) return res.status(404).json({ success: false, message: "Kurs topilmadi" });
    res.json({ success: true, message: "Kurs yangilandi", course });
  } catch (err) { next(err); }
});

/**
 * DELETE /api/admin/courses/:id
 * Kursni o'chirish (darslari bilan birga)
 */
router.delete("/courses/:id", async (req, res, next) => {
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

// ═══════════════════════════════════════════════════════
//                  LESSON MANAGEMENT
// ═══════════════════════════════════════════════════════

/**
 * GET /api/admin/courses/:courseId/lessons
 * Kurs darslari
 */
router.get("/courses/:courseId/lessons", async (req, res, next) => {
  try {
    const lessons = await Lesson.find({ courseId: req.params.courseId }).sort("order");
    res.json({ success: true, lessons });
  } catch (err) { next(err); }
});

/**
 * POST /api/admin/courses/:courseId/lessons
 * Yangi dars qo'shish
 */
router.post("/courses/:courseId/lessons", async (req, res, next) => {
  try {
    const { title, content, videoUrl, duration, order, isPro } = req.body;
    if (!title || !content) return res.status(400).json({ success: false, message: "Sarlavha va mazmun majburiy" });

    const course = await Course.findById(req.params.courseId);
    if (!course) return res.status(404).json({ success: false, message: "Kurs topilmadi" });

    const lesson = await Lesson.create({
      courseId: req.params.courseId, title, content, videoUrl, duration, order,
      isPro: isPro ?? course.isPro,
    });

    res.status(201).json({ success: true, message: "Dars qo'shildi", lesson });
  } catch (err) { next(err); }
});

/**
 * PATCH /api/admin/courses/:courseId/lessons/:id
 * Darsni tahrirlash
 */
router.patch("/courses/:courseId/lessons/:id", async (req, res, next) => {
  try {
    const lesson = await Lesson.findOneAndUpdate(
      { _id: req.params.id, courseId: req.params.courseId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!lesson) return res.status(404).json({ success: false, message: "Dars topilmadi" });
    res.json({ success: true, message: "Dars yangilandi", lesson });
  } catch (err) { next(err); }
});

/**
 * DELETE /api/admin/courses/:courseId/lessons/:id
 * Darsni o'chirish
 */
router.delete("/courses/:courseId/lessons/:id", async (req, res, next) => {
  try {
    const lesson = await Lesson.findOneAndDelete({ _id: req.params.id, courseId: req.params.courseId });
    if (!lesson) return res.status(404).json({ success: false, message: "Dars topilmadi" });
    res.json({ success: true, message: "Dars o'chirildi" });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════
//              ADMIN ACCOUNT SETUP
// ═══════════════════════════════════════════════════════

/**
 * POST /api/admin/create-admin
 * Birinchi admin hisob yaratish (faqat ADMIN_KEY bilan)
 * Faqat bir marta ishlatiladi!
 */
router.post("/create-admin", { skip: true }, async (req, res, next) => {
  // Bu route requireAdmin dan oldin ishlashi kerak — app.js da alohida qo'shing:
  // app.post("/api/admin/create-admin", createAdminHandler);
  res.json({ success: false, message: "Bu route app.js da alohida ro'yxatdan o'tkazilishi kerak" });
});

module.exports = router;

// ═══════════════════════════════════════════════════════
//   server.js ga qo'shadigan qo'shimcha kod
// ═══════════════════════════════════════════════════════

/*

1) User Schema ga qo'shing:
   isAdmin:   { type: Boolean, default: false },
   isBlocked: { type: Boolean, default: false },

2) protect middleware ga qo'shing (bloklangan foydalanuvchini tekshirish):
   if (user.isBlocked) {
     return res.status(403).json({ success: false, message: "Hisobingiz bloklangan" });
   }

3) server.js ga qo'shing (barcha routelardan oldin):
   // Admin hisob yaratish (faqat bir marta, ADMIN_KEY bilan)
   app.post("/api/admin/create-admin", async (req, res) => {
     try {
       const key = req.headers["x-admin-key"];
       if (key !== (process.env.ADMIN_KEY || "porla_admin_2024"))
         return res.status(403).json({ success: false, message: "Ruxsat yo'q" });

       const { name, email, password } = req.body;
       if (!name || !email || !password)
         return res.status(400).json({ success: false, message: "Barcha maydonlar talab qilinadi" });

       if (await User.findOne({ isAdmin: true }))
         return res.status(409).json({ success: false, message: "Admin allaqachon mavjud" });

       const admin = await User.create({ name, email, password, isAdmin: true, isPro: true });
       res.status(201).json({ success: true, message: "Admin yaratildi", user: admin.toPublicJSON() });
     } catch (err) {
       res.status(500).json({ success: false, message: err.message });
     }
   });

4) Admin routerlarni qo'shing (protect dan keyin):
   const adminRoutes = require("./admin.routes");
   app.use("/api/admin", protect, adminRoutes);

*/