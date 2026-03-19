/**
 * User Model
 */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Ism majburiy"],
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    email: {
      type: String,
      required: [true, "Email majburiy"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Email noto'g'ri formatda"],
    },
    password: {
      type: String,
      required: [true, "Parol majburiy"],
      minlength: 6,
      select: false,
    },
    avatar: {
      type: String,
      default: "",
    },
    isPro: {
      type: Boolean,
      default: false,
    },
    proExpiresAt: {
      type: Date,
      default: null,
    },
    completedLessons: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Lesson",
      },
    ],
    lastLogin: {
      type: Date,
      default: null,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Hash password before save
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// Compare password method
userSchema.methods.comparePassword = function (pwd) {
  return bcrypt.compare(pwd, this.password);
};

// Return public user info
userSchema.methods.toPublicJSON = function () {
  const {
    _id,
    name,
    email,
    avatar,
    isPro,
    proExpiresAt,
    completedLessons,
    createdAt,
    lastLogin,
    isAdmin,
    isBlocked,
  } = this;
  return {
    _id,
    name,
    email,
    avatar,
    isPro,
    proExpiresAt,
    completedLessons,
    createdAt,
    lastLogin,
    isAdmin,
    isBlocked,
  };
};

module.exports = mongoose.model("User", userSchema);

// # JWT_EXPIRES=30d
// # PORT=5000# JWT_EXPIRES=30d
// # PORT=5000
// # JWT_EXPIRES=30d
// # PORT=5000# JWT_EXPIRES=30d
// # PORT=5000
// # JWT_EXPIRES=30d
// # PORT=5000# JWT_EXPIRES=30d
// # PORT=5000
// # JWT_EXPIRES=30d
// # PORT=5000# JWT_EXPIRES=30d
// # PORT=5000