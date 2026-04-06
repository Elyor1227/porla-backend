/**
 * Admin: dars videosini diskka yozish (multer)
 */

const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const UPLOAD_ROOT = path.join(__dirname, "../../uploads");
const VIDEO_DIR = path.join(UPLOAD_ROOT, "videos");

function ensureVideoUploadDirs() {
  [UPLOAD_ROOT, VIDEO_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
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
