/**
 * Foydalanuvchi kiritmalarini xavfsiz ishlatish uchun yordamchilar.
 */

/**
 * Regex maxsus belgilarini ekranlash — $regex injection / ReDoS oldini oladi.
 * @param {string} str
 * @returns {string}
 */
function escapeRegex(str) {
  return String(str || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Qidiruv uchun xavfsiz, uzunligi cheklangan regex matni.
 * @param {string} str
 * @param {number} maxLen
 */
function safeSearchRegex(str, maxLen = 100) {
  return escapeRegex(String(str || "").trim().slice(0, maxLen));
}

module.exports = { escapeRegex, safeSearchRegex };
