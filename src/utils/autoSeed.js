/**
 * Auto Seed — admin + boshlang'ich kurslar
 *
 * Admin: .env da SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_ADMIN_NAME
 * (yoki BOOTSTRAP_ADMIN_*) yoki quyidagi SEED_ADMIN obyektini to'ldiring.
 * .env ustunlik beradi. Gitga haqiqiy parol commit qilmang.
 */

const Course = require("../models/Course");
const Lesson = require("../models/Lesson");
const User = require("../models/User");

/** Shu yerda to'ldiring — env bo'sh bo'lsa ishlatiladi */
const SEED_ADMIN = {
  email: "",
  password: "",
  name: "Admin",
};

function resolveSeedAdmin() {
  const emailRaw =
    process.env.SEED_ADMIN_EMAIL ||
    process.env.BOOTSTRAP_ADMIN_EMAIL ||
    SEED_ADMIN.email;
  const passwordRaw =
    process.env.SEED_ADMIN_PASSWORD ||
    process.env.BOOTSTRAP_ADMIN_PASSWORD ||
    SEED_ADMIN.password;
  const nameRaw =
    process.env.SEED_ADMIN_NAME ||
    process.env.BOOTSTRAP_ADMIN_NAME ||
    SEED_ADMIN.name ||
    "Admin";

  const email = String(emailRaw || "")
    .trim()
    .toLowerCase();
  const password = passwordRaw != null ? String(passwordRaw) : "";
  const name = String(nameRaw).trim() || "Admin";

  return { email, password, name };
}

async function seedAdminIfNeeded() {
  const { email, password, name } = resolveSeedAdmin();

  if (!email || !password) {
    return;
  }

  if (password.length < 6) {
    console.warn(
      "⚠  Seed admin: parol kamida 6 belgi — admin yaratilmadi"
    );
    return;
  }

  const hasAdmin = await User.findOne({ isAdmin: true });
  if (hasAdmin) {
    return;
  }

  const existing = await User.findOne({ email }).select("+password");
  if (existing) {
    existing.isAdmin = true;
    existing.isPro = true;
    existing.password = password;
    await existing.save();
    console.log("✅  Seed: mavjud foydalanuvchi admin qilindi:", email);
    return;
  }

  await User.create({
    name,
    email,
    password,
    isAdmin: true,
    isPro: true,
  });
  console.log("✅  Seed: admin yaratildi:", email);
}

const autoSeed = async () => {
  try {
    await seedAdminIfNeeded();

    const count = await Course.countDocuments().catch(() => 0);
    if (count > 0) {
      console.log("✅  Kurslar allaqon mavjud, kurs seed qilinmadi");
      return;
    }

    console.log("🌱  AutoSeed: kurslar qo'shilmoqda...");

    const courseList = await Course.insertMany([
      {
        title: "Ayollar reproduktiv tizimi",
        description:
          "Reproduktiv organlar, ularning vazifalari va asosiy tushunchalar.",
        icon: "🩺",
        color: "#3b7de8",
        bgColor: "#eff6ff",
        isPro: false,
        order: 1,
      },
      {
        title: "Hayz sikli",
        description:
          "Normal tsikl, uning fazalari, ta'sir etuvchi omillar va kuzatish.",
        icon: "🌸",
        color: "#d64f6e",
        bgColor: "#fde8ec",
        isPro: false,
        order: 2,
      },
      {
        title: "Ayol gormonlari salomatligi o'rni",
        description:
          "Gormonlar, ularning muvozanati va sog'liqqa ta'siri haqida kurs.",
        icon: "⚗️",
        color: "#8657d6",
        bgColor: "#f3f0ff",
        isPro: true,
        order: 3,
      },
      {
        title: "Vaginal ajralmalar",
        description:
          "Normal va g'ayri-normal ajralmalarni farqlash, qachon murojaat qilish.",
        icon: "💧",
        color: "#0891b2",
        bgColor: "#ecfeff",
        isPro: true,
        order: 4,
      },
      {
        title: "Anemiya",
        description:
          "Temir tanqisligi, belgilari, sabablari va davolash usullari.",
        icon: "🩸",
        color: "#dc2626",
        bgColor: "#fef2f2",
        isPro: true,
        order: 5,
      },
    ]);

    const lessons = [];
    courseList.forEach((c) => {
      const total = c.isPro ? 3 : 2;
      for (let i = 1; i <= total; i++) {
        lessons.push({
          courseId: c._id,
          title: c.title + " — " + i + "-dars",
          content:
            i === 1
              ? "Asosiy tushunchalar bilan tanishish. Keyingi darslarda amaliy misollar bo'ladi."
              : "Amaliy mashg'ulot va mustahkamlash.",
          videoUrl: "",
          duration: 8 + i * 4,
          order: i,
          isPro: c.isPro,
        });
      }
    });

    await Lesson.insertMany(lessons);
    console.log(
      `✅  AutoSeed: ${courseList.length} kurs, ${lessons.length} dars qo'shildi`
    );
  } catch (error) {
    console.error("⚠  AutoSeed xatosi:", error.message);
  }
};

module.exports = autoSeed;
