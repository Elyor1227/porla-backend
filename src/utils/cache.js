/**
 * Yengil cache qatlami.
 *
 * Default: in-memory TTL cache (qo'shimcha infratuzilma talab qilmaydi).
 * Agar REDIS_URL berilgan va `ioredis` o'rnatilgan bo'lsa — Redis ishlatiladi
 * (gorizontal scaling uchun). Aks holda jimgina in-memory'ga tushadi.
 */

const logger = require("./logger");

// ── In-memory backend ──
const store = new Map(); // key -> { value, expiresAt }

function memGet(key) {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt && entry.expiresAt < Date.now()) {
    store.delete(key);
    return undefined;
  }
  return entry.value;
}

function memSet(key, value, ttlSeconds) {
  store.set(key, {
    value,
    expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : 0,
  });
}

function memDel(prefix) {
  for (const key of store.keys()) {
    if (key === prefix || key.startsWith(`${prefix}:`)) store.delete(key);
  }
}

// ── Optional Redis backend ──
let redis = null;
if (process.env.REDIS_URL) {
  try {
    const Redis = require("ioredis");
    redis = new Redis(process.env.REDIS_URL, { lazyConnect: false, maxRetriesPerRequest: 2 });
    redis.on("error", (err) => logger.warn({ err: err.message }, "Redis xatosi"));
    logger.info("🧰  Cache: Redis ishlatilmoqda");
  } catch (_) {
    logger.warn("REDIS_URL berilgan, lekin 'ioredis' o'rnatilmagan — in-memory cache ishlatiladi");
  }
}

async function get(key) {
  if (redis) {
    const raw = await redis.get(key).catch(() => null);
    return raw ? JSON.parse(raw) : undefined;
  }
  return memGet(key);
}

async function set(key, value, ttlSeconds = 60) {
  if (redis) {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds).catch(() => {});
    return;
  }
  memSet(key, value, ttlSeconds);
}

/** Prefiks bo'yicha invalidatsiya (masalan "courses"). */
async function del(prefix) {
  if (redis) {
    const keys = await redis.keys(`${prefix}*`).catch(() => []);
    if (keys.length) await redis.del(keys).catch(() => {});
    return;
  }
  memDel(prefix);
}

/**
 * Cache-aside: agar mavjud bo'lsa cache'dan, bo'lmasa producer ishga tushadi.
 */
async function wrap(key, ttlSeconds, producer) {
  const cached = await get(key);
  if (cached !== undefined) return cached;
  const fresh = await producer();
  await set(key, fresh, ttlSeconds);
  return fresh;
}

module.exports = { get, set, del, wrap };
