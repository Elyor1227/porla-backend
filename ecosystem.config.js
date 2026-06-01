/**
 * PM2 process manager konfiguratsiyasi.
 * Ishga tushirish:  pm2 start ecosystem.config.js --env production
 */
module.exports = {
  apps: [
    {
      name: "porla-backend",
      script: "src/index.js",
      instances: process.env.PM2_INSTANCES || "max",
      exec_mode: "cluster",
      max_memory_restart: "400M",
      kill_timeout: 12000, // graceful shutdown timeout (10s) dan biroz ko'p
      wait_ready: false,
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      },
    },
  ],
};
