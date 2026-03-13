const User   = require("../models/User");
const Course = require("../models/Course");
const Lesson = require("../models/Lesson");

/* ════════════════════════════════════════
   DASHBOARD STATISTIKA
════════════════════════════════════════ */
exports.getDashboard = async (req, res) => {
  try {
    const [
      totalUsers,
      proUsers,
      activeUsers,
      totalCourses,
      publishedCourses,
      totalLessons,
      newUsersToday,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isPro: true }),
      User.countDocuments({ isActive: true }),
      Course.countDocuments(),
      Course.countDocuments({ isPublished: true }),
      Lesson.countDocuments(),
      User.countDocuments({
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      }),
    ]);

    // Oxirgi 7 kun yangi foydalanuvchilar
    const last7Days = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Oxirgi 5 foydalanuvchi
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("name email isPro isActive createdAt");

    res.json({
      success: true,
      stats: {
        totalUsers, proUsers, activeUsers,
        totalCourses, publishedCourses, totalLessons,
        newUsersToday,
      },
      last7Days,
      recentUsers,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ════════════════════════════════════════
   FOYDALANUVCHILAR
════════════════════════════════════════ */

/* GET /api/admin/users  — ro'yxat, filter, pagination */
exports.getUsers = async (req, res) => {
  try {
    const page    = parseInt(req.query.page)  || 1;
    const limit   = parseInt(req.query.limit) || 20;
    const search  = req.query.search  || "";
    const filter  = req.query.filter  || "all"; // all | pro | free | admin | inactive

    const query = {};
    if (search) {
      query.$or = [
        { name:  { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    if (filter === "pro")      query.isPro    = true;
    if (filter === "free")     query.isPro    = false;
    if (filter === "admin")    query.isAdmin  = true;
    if (filter === "inactive") query.isActive = false;

    const [users, total] = await Promise.all([
      User.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select("-password -resetPasswordToken -resetPasswordExpire"),
      User.countDocuments(query),
    ]);

    res.json({
      success: true,
      users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* GET /api/admin/users/:id */
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password")
      .populate("completedLessons", "title course");
    if (!user) return res.status(404).json({ success: false, message: "Foydalanuvchi topilmadi" });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* PUT /api/admin/users/:id/pro — Pro berish / olish */
exports.togglePro = async (req, res) => {
  try {
    const { isPro, proExpiresAt } = req.body; // proExpiresAt: null = abadiy
    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        isPro,
        proExpiresAt: isPro ? (proExpiresAt || null) : null,
      },
      { new: true }
    ).select("-password");

    if (!user) return res.status(404).json({ success: false, message: "Foydalanuvchi topilmadi" });

    res.json({
      success: true,
      message: isPro ? `${user.name} ga Pro berildi` : `${user.name} Pro olib tashlandi`,
      user,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* PUT /api/admin/users/:id/toggle-active — bloklash / aktivlashtirish */
exports.toggleActive = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "Foydalanuvchi topilmadi" });
    if (user.isAdmin) return res.status(400).json({ success: false, message: "Adminni bloklash mumkin emas" });

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      success: true,
      message: user.isActive ? "Foydalanuvchi aktivlashtirildi" : "Foydalanuvchi bloklandi",
      user: user.toPublic(),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* PUT /api/admin/users/:id/make-admin */
exports.makeAdmin = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isAdmin: true },
      { new: true }
    ).select("-password");
    if (!user) return res.status(404).json({ success: false, message: "Foydalanuvchi topilmadi" });
    res.json({ success: true, message: `${user.name} admin qilindi`, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* DELETE /api/admin/users/:id */
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "Foydalanuvchi topilmadi" });
    if (user.isAdmin) return res.status(400).json({ success: false, message: "Adminni o'chirish mumkin emas" });
    await user.deleteOne();
    res.json({ success: true, message: "Foydalanuvchi o'chirildi" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* POST /api/admin/users/bulk-pro — ko'p foydalanuvchiga bir vaqtda Pro berish */
exports.bulkGrantPro = async (req, res) => {
  try {
    const { userIds, isPro, proExpiresAt } = req.body;
    if (!Array.isArray(userIds) || !userIds.length) {
      return res.status(400).json({ success: false, message: "userIds massivi kerak" });
    }
    const result = await User.updateMany(
      { _id: { $in: userIds } },
      { isPro, proExpiresAt: isPro ? (proExpiresAt || null) : null }
    );
    res.json({ success: true, message: `${result.modifiedCount} ta foydalanuvchi yangilandi` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ════════════════════════════════════════
   KURSLAR
════════════════════════════════════════ */

exports.getCourses = async (req, res) => {
  try {
    const courses = await Course.find()
      .sort({ order: 1, createdAt: -1 })
      .populate("lessons", "title order isPro isPublished")
      .populate("createdBy", "name");
    res.json({ success: true, courses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate({ path: "lessons", options: { sort: { order: 1 } } })
      .populate("createdBy", "name email");
    if (!course) return res.status(404).json({ success: false, message: "Kurs topilmadi" });
    res.json({ success: true, course });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createCourse = async (req, res) => {
  try {
    const { title, description, shortDesc, icon, color, bgColor, isPro, order } = req.body;
    const course = await Course.create({
      title, description, shortDesc, icon, color, bgColor, isPro, order,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, message: "Kurs yaratildi", course });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.updateCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!course) return res.status(404).json({ success: false, message: "Kurs topilmadi" });
    res.json({ success: true, message: "Kurs yangilandi", course });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: "Kurs topilmadi" });
    // Barcha darslarni ham o'chiramiz
    await Lesson.deleteMany({ course: course._id });
    await course.deleteOne();
    res.json({ success: true, message: "Kurs va barcha darslari o'chirildi" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.togglePublishCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: "Kurs topilmadi" });
    course.isPublished = !course.isPublished;
    await course.save();
    res.json({ success: true, message: course.isPublished ? "Kurs chop etildi" : "Kurs yashirildi", course });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ════════════════════════════════════════
   DARSLAR
════════════════════════════════════════ */

exports.getLessons = async (req, res) => {
  try {
    const { courseId } = req.query;
    const filter = courseId ? { course: courseId } : {};
    const lessons = await Lesson.find(filter)
      .sort({ order: 1 })
      .populate("course", "title");
    res.json({ success: true, lessons });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getLesson = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id).populate("course", "title");
    if (!lesson) return res.status(404).json({ success: false, message: "Dars topilmadi" });
    res.json({ success: true, lesson });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createLesson = async (req, res) => {
  try {
    const { title, content, videoUrl, duration, courseId, order, isPro, quiz } = req.body;
    if (!courseId) return res.status(400).json({ success: false, message: "courseId majburiy" });

    const lesson = await Lesson.create({
      title, content, videoUrl, duration,
      course: courseId, order, isPro, quiz,
      createdBy: req.user._id,
    });

    // Kursga ham qo'shamiz
    await Course.findByIdAndUpdate(courseId, { $push: { lessons: lesson._id } });

    res.status(201).json({ success: true, message: "Dars yaratildi", lesson });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.updateLesson = async (req, res) => {
  try {
    const lesson = await Lesson.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!lesson) return res.status(404).json({ success: false, message: "Dars topilmadi" });
    res.json({ success: true, message: "Dars yangilandi", lesson });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.deleteLesson = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) return res.status(404).json({ success: false, message: "Dars topilmadi" });
    // Kursdan ham olib tashlaymiz
    await Course.findByIdAndUpdate(lesson.course, { $pull: { lessons: lesson._id } });
    await lesson.deleteOne();
    res.json({ success: true, message: "Dars o'chirildi" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.togglePublishLesson = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) return res.status(404).json({ success: false, message: "Dars topilmadi" });
    lesson.isPublished = !lesson.isPublished;
    await lesson.save();
    res.json({ success: true, message: lesson.isPublished ? "Dars chop etildi" : "Dars yashirildi", lesson });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
