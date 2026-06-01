/**
 * Muhit o'zgaruvchilarini startupda tekshirish.
 * Kritik kalitlar yo'q bo'lsa server ishga tushmaydi (xavfsiz fallback yo'q).
 */

const REQUIRED = ["MONGODB_URI", "JWT_SECRET"];
const RECOMMENDED = ["ADMIN_KEY", "FRONTEND_URL"];

function validateEnv() {
  const missing = REQUIRED.filter((key) => !process.env[key] || !String(process.env[key]).trim());

  if (missing.length) {
    console.error(
      `❌  Quyidagi majburiy muhit o'zgaruvchilari yo'q: ${missing.join(", ")}`
    );
    console.error("    Serverni ishga tushirish to'xtatildi.");
    process.exit(1);
  }

  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 16) {
    console.warn(
      "⚠  JWT_SECRET juda qisqa (kamida 16 belgi tavsiya etiladi)."
    );
  }

  const missingRecommended = RECOMMENDED.filter(
    (key) => !process.env[key] || !String(process.env[key]).trim()
  );
  if (missingRecommended.length) {
    console.warn(
      `⚠  Tavsiya etilgan muhit o'zgaruvchilari yo'q: ${missingRecommended.join(", ")}`
    );
  }
}

module.exports = { validateEnv };
