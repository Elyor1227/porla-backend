/**
 * Auth Routes
 */

const express = require("express");
const authController = require("../controllers/authController");
const { protect } = require("../middlewares/auth");

const router = express.Router();

router.post("/register", (req, res, next) =>
  authController.register(req, res, next)
);
router.post("/login", (req, res, next) =>
  authController.login(req, res, next)
);
router.get("/me", protect, (req, res, next) =>
  authController.getMe(req, res, next)
);
router.post("/logout", protect, (req, res, next) =>
  authController.logout(req, res, next)
);
router.patch("/update-profile", protect, (req, res, next) =>
  authController.updateProfile(req, res, next)
);
router.patch("/change-password", protect, (req, res, next) =>
  authController.changePassword(req, res, next)
);

module.exports = router;
