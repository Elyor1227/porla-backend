/**
 * Strukturalangan logging (pino).
 * Development'da o'qish qulay (pino-pretty bo'lsa), production'da JSON.
 */

const pino = require("pino");

const isProd = process.env.NODE_ENV === "production";
const level = process.env.LOG_LEVEL || (isProd ? "info" : "debug");

let transport;
if (!isProd) {
  // pino-pretty ixtiyoriy: o'rnatilmagan bo'lsa, oddiy JSON ishlatiladi
  try {
    require.resolve("pino-pretty");
    transport = {
      target: "pino-pretty",
      options: { colorize: true, translateTime: "SYS:HH:MM:ss", ignore: "pid,hostname" },
    };
  } catch (_) {
    transport = undefined;
  }
}

const logger = pino({
  level,
  ...(transport ? { transport } : {}),
});

module.exports = logger;
