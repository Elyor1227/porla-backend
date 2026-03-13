const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const UserSchema = new mongoose.Schema(
  {
    name: {
      type:     String,
      required: [true, "Ism majburiy"],
      trim:     true,
      minlength:[2, "Ism kamida 2 ta harf"],
      maxlength:[50, "Ism 50 ta harfdan oshmasin"],
    },
    email: {
      type:     String,
      required: [true, "Email majburiy"],
      unique:   true,
      lowercase:true,
      trim:     true,
      match:    [/^\S+@\S+\.\S+$/, "To'g'ri email kiriting"],
    },
    password: {
      type:     String,
      required: [true, "Parol majburiy"],
      minlength:[6, "Parol kamida 6 ta belgi"],
      select:   false,
    },
    avatar: { type: String, default: null },

    /* ── Roles ── */
    isAdmin: { type: Boolean, default: false },
    isPro:   { type: Boolean, default: false },
    proExpiresAt: { type: Date, default: null }, // null = abadiy

    /* ── Health data ── */
    cycleLength:    { type: Number, default: 28, min: 21, max: 35 },
    lastPeriodDate: { type: Date,   default: null },

    /* ── Progress ── */
    completedLessons: [{ type: mongoose.Schema.Types.ObjectId, ref: "Lesson" }],

    /* ── Status ── */
    isActive:  { type: Boolean, default: true },
    lastSeen:  { type: Date,    default: null },

    /* ── Reset password ── */
    resetPasswordToken:  String,
    resetPasswordExpire: Date,
  },
  { timestamps: true }
);

/* ── Hash password ── */
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

/* ── Methods ── */
UserSchema.methods.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

UserSchema.methods.toPublic = function () {
  return {
    _id:              this._id,
    name:             this.name,
    email:            this.email,
    avatar:           this.avatar,
    isAdmin:          this.isAdmin,
    isPro:            this.isPro,
    proExpiresAt:     this.proExpiresAt,
    cycleLength:      this.cycleLength,
    lastPeriodDate:   this.lastPeriodDate,
    completedLessons: this.completedLessons,
    isActive:         this.isActive,
    lastSeen:         this.lastSeen,
    createdAt:        this.createdAt,
  };
};

/* ── Check if pro is still valid ── */
UserSchema.methods.hasActivePro = function () {
  if (!this.isPro) return false;
  if (!this.proExpiresAt) return true; // abadiy
  return new Date() < this.proExpiresAt;
};

module.exports = mongoose.model("User", UserSchema);
