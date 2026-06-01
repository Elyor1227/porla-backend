// Testlar uchun majburiy muhit o'zgaruvchilari (constants.js require qilinishidan oldin)
process.env.JWT_SECRET = process.env.JWT_SECRET || "test_secret_key_1234567890";
process.env.JWT_EXPIRES = "1h";
process.env.JWT_REFRESH_EXPIRES = "7d";
process.env.NODE_ENV = "test";
process.env.MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/porla_test";
