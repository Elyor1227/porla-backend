/**
 * Token blacklist (logout) — cache asosida (Redis bo'lsa Redis, aks holda in-memory).
 * Tokenni token amal qilish muddati tugaguncha qora ro'yxatga qo'yadi.
 */

const cache = require("./cache");

const key = (jti) => `bl:${jti}`;

/**
 * Tokenni blacklistga qo'shadi. exp — token expiry (unix seconds).
 */
async function blacklist(jti, exp) {
  if (!jti) return;
  const ttl = exp ? Math.max(1, exp - Math.floor(Date.now() / 1000)) : 3600;
  await cache.set(key(jti), 1, ttl);
}

async function isBlacklisted(jti) {
  if (!jti) return false;
  const v = await cache.get(key(jti));
  return v !== undefined;
}

module.exports = { blacklist, isBlacklisted };
