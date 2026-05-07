/**
 * Admin: dars videosini diskka yoki S3-compatible storage ga yozish (multer)
 */

const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const {
  isS3VideoEnabled,
  validateS3EnvOrExit,
  uploadMulterBufferFile,
  deleteObjectKey,
} = require("./videoS3Storage");

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
  if (isS3VideoEnabled()) return;
  try {
    [UPLOAD_ROOT, VIDEO_DIR].forEach((dir) => tryEnsure(dir));
  } catch (err) {
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

const diskStorage = multer.diskStorage({
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

const multerLimits = { fileSize: 500 * 1024 * 1024 };

const diskUpload = multer({
  storage: diskStorage,
  limits: multerLimits,
  fileFilter,
});

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: multerLimits,
  fileFilter,
});

/**
 * S3: buffer → bulut; req.file.filename va req.lessonVideoStorage o'rnatiladi
 */
async function flushVideoBufferToS3(req, res, next) {
  if (!req.file?.buffer) return next();
  try {
    const key = await uploadMulterBufferFile(req.file);
    req.file.filename = key;
    req.lessonVideoStorage = "s3";
    next();
  } catch (err) {
    next(err);
  }
}

const lessonUploadChain = isS3VideoEnabled()
  ? [memoryUpload.single("video"), flushVideoBufferToS3]
  : [diskUpload.single("video")];

/**
 * @param {{ videoFile?: string, videoStorage?: string }} lesson
 */
function deleteLessonVideoAsset(lesson) {
  if (!lesson?.videoFile) return;
  const kind = (lesson.videoStorage || "local") === "s3" ? "s3" : "local";
  if (kind === "s3") {
    deleteObjectKey(lesson.videoFile).catch(() => {});
    return;
  }
  const p = getVideoPath(lesson.videoFile);
  if (p && fs.existsSync(p)) {
    try {
      fs.unlinkSync(p);
    } catch (_) {}
  }
}

/**
 * @param {string} filename - DB dagi videoFile (faqat local)
 * @returns {string|null} - diskdagi to'liq yo'l yoki noto'g'ri nom
 */
function getVideoPath(filename) {
  if (!filename || typeof filename !== "string") return null;
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return null;
  }
  return path.join(VIDEO_DIR, filename);
}

/** @deprecated deleteLessonVideoAsset ishlating */
function deleteStoredVideo(filename) {
  deleteLessonVideoAsset({ videoFile: filename, videoStorage: "local" });
}

module.exports = {
  uploadLessonVideo: diskUpload.single("video"),
  lessonUploadChain,
  VIDEO_DIR,
  ensureVideoUploadDirs,
  getVideoPath,
  deleteStoredVideo,
  deleteLessonVideoAsset,
  validateVideoStorageOnStartup: validateS3EnvOrExit,
};
