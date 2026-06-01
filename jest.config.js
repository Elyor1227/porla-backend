/** Jest konfiguratsiyasi */
module.exports = {
  testEnvironment: "node",
  setupFiles: ["<rootDir>/tests/setupEnv.js"],
  testMatch: ["<rootDir>/tests/**/*.test.js"],
  collectCoverageFrom: ["src/utils/**/*.js", "src/config/constants.js"],
  verbose: true,
};
