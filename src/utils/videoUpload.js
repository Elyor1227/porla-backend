/**
 * Admin: dars videosini diskka yozish (multer)
 */

const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

function resolveVideoDir() {
  const fromEnv = process.env.VIDEO_STORAGE_DIR;
  if (fromEnv && String(fromEnv).trim()) {
    const raw = String(fromEnv).trim();
    return path.isAbsolute(raw)
      ? raw
      : path.resolve(__dirname, "../../", raw);
  }
  return path.join(__dirname, "../../uploads/videos");
}

const DEFAULT_VIDEO_DIR = path.join(__dirname, "../../uploads/videos");
let VIDEO_DIR = resolveVideoDir();
let UPLOAD_ROOT = path.dirname(VIDEO_DIR);

function tryEnsure(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function ensureVideoUploadDirs() {
  try {
    [UPLOAD_ROOT, VIDEO_DIR].forEach((dir) => tryEnsure(dir));
  } catch (err) {
    // Agar env papkaga yozish ruxsati bo'lmasa, ilova yiqilmasin.
    if (err && (err.code === "EACCES" || err.code === "EPERM")) {
      VIDEO_DIR = DEFAULT_VIDEO_DIR;
      UPLOAD_ROOT = path.dirname(VIDEO_DIR);
      [UPLOAD_ROOT, VIDEO_DIR].forEach((dir) => tryEnsure(dir));
      console.warn(
        `⚠  VIDEO_STORAGE_DIR ga yozib bo'lmadi, fallback ishlatildi: ${VIDEO_DIR}`
      );
      return;
    }
    throw err;
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureVideoUploadDirs();
    cb(null, VIDEO_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "") || ".mp4";
    const safe = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
    cb(null, safe);
  },
});

const ALLOWED_EXT = /\.(mp4|webm|mov|m4v)$/i;

function fileFilter(req, file, cb) {
  const nameOk = ALLOWED_EXT.test(file.originalname || "");
  const mimeOk = (file.mimetype || "").startsWith("video/");
  if (nameOk || mimeOk) return cb(null, true);
  cb(new Error("Faqat video fayllar (mp4, webm, mov, m4v) qabul qilinadi"));
}

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter,
});

/**
 * @param {string} filename - DB dagi videoFile
 * @returns {string|null} - diskdagi to'liq yo'l yoki noto'g'ri nom
 */
function getVideoPath(filename) {
  if (!filename || typeof filename !== "string") return null;
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return null;
  }
  return path.join(VIDEO_DIR, filename);
}

function deleteStoredVideo(filename) {
  const p = getVideoPath(filename);
  if (p && fs.existsSync(p)) {
    try {
      fs.unlinkSync(p);
    } catch (_) {}
  }
}

module.exports = {
  uploadLessonVideo: upload.single("video"),
  VIDEO_DIR,
  ensureVideoUploadDirs,
  getVideoPath,
  deleteStoredVideo,
};
