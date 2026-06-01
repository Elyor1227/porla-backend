/**
 * Pro obuna holatini hisoblash (DRY — bir nechta joyda takrorlangan kod o'rniga).
 */

const DAY_MS = 86400000;

/**
 * Foydalanuvchi obyektiga (yoki POJO ga) qarab Pro qoldiq kunlarini hisoblaydi.
 * @param {{ isPro?: boolean, proExpiresAt?: Date|string|null }} user
 * @returns {{ proDaysLeft?: number, proExpired?: boolean }}
 */
function computeProMeta(user) {
  if (!user || !user.isPro || !user.proExpiresAt) return {};
  const msLeft = new Date(user.proExpiresAt) - new Date();
  return {
    proDaysLeft: Math.max(0, Math.ceil(msLeft / DAY_MS)),
    proExpired: msLeft < 0,
  };
}

/**
 * Pro muddati o'tganmi?
 */
function isProExpired(user) {
  return Boolean(
    user &&
      user.isPro &&
      user.proExpiresAt &&
      new Date(user.proExpiresAt) < new Date()
  );
}

module.exports = { computeProMeta, isProExpired };
