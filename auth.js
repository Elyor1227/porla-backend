const jwt  = require("jsonwebtoken");
const User = require("../models/User");

/* ── Token tekshirish ── */
const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (!token) return res.status(401).json({ success: false, message: "Kirish uchun tizimga kiring" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");
    if (!req.user) return res.status(401).json({ success: false, message: "Foydalanuvchi topilmadi" });
    next();
  } catch {
    res.status(401).json({ success: false, message: "Token yaroqsiz" });
  }
};

/* ── Admin tekshirish ── */
const adminOnly = (req, res, next) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ success: false, message: "Faqat adminlar uchun" });
  }
  next();
};

/* ── Pro tekshirish ── */
const requirePro = (req, res, next) => {
  if (!req.user?.hasActivePro?.()) {
    return res.status(403).json({ success: false, message: "Bu kurs faqat Pro foydalanuvchilar uchun" });
  }
  next();
};

module.exports = { protect, adminOnly, requirePro };
