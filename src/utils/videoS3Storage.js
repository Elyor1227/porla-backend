/**
 * S3-compatible object storage (AWS S3, Cloudflare R2, MinIO, ...).
 * Render va boshqa serverless/ephemeral disk muhitlarida videolar redeploy bilan yo'qolmasin.
 */

const path = require("path");
const crypto = require("crypto");
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");

function readS3Env() {
  const bucket = process.env.S3_BUCKET || process.env.AWS_S3_BUCKET;
  const accessKeyId =
    process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey =
    process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
  const region =
    process.env.S3_REGION || process.env.AWS_REGION || "us-east-1";
  const endpoint = process.env.S3_ENDPOINT || undefined;
  return { bucket, accessKeyId, secretAccessKey, region, endpoint };
}

function isS3VideoEnabled() {
  return String(process.env.VIDEO_STORAGE || "").toLowerCase() === "s3";
}

function createClient() {
  const { accessKeyId, secretAccessKey, region, endpoint } = readS3Env();
  const cfg = {
    region,
    credentials: { accessKeyId, secretAccessKey },
  };
  if (endpoint) {
    cfg.endpoint = endpoint;
    cfg.forcePathStyle =
      process.env.S3_FORCE_PATH_STYLE === "true" ||
      process.env.S3_FORCE_PATH_STYLE === "1";
  }
  return new S3Client(cfg);
}

let cachedClient;

function getClient() {
  if (!cachedClient) cachedClient = createClient();
  return cachedClient;
}

function assertS3Config() {
  const { bucket, accessKeyId, secretAccessKey } = readS3Env();
  const missing = [];
  if (!bucket) missing.push("S3_BUCKET");
  if (!accessKeyId) missing.push("S3_ACCESS_KEY_ID");
  if (!secretAccessKey) missing.push("S3_SECRET_ACCESS_KEY");
  if (missing.length) {
    const err = new Error(
      `VIDEO_STORAGE=s3 uchun quyidagi o'zgaruvchilar kerak: ${missing.join(", ")}`
    );
    err.statusCode = 500;
    throw err;
  }
}

function validateS3EnvOrExit() {
  if (!isS3VideoEnabled()) return;
  try {
    assertS3Config();
  } catch (e) {
    console.error("❌", e.message);
    process.exit(1);
  }
  console.log(`✅  Video storage: S3 / R2 (${readS3Env().bucket})`);
}

function buildObjectKey(originalName) {
  const ext = path.extname(originalName || "") || ".mp4";
  const safe = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
  const prefixRaw = process.env.S3_KEY_PREFIX || "lesson-videos";
  const prefix = String(prefixRaw).replace(/^\/+|\/+$/g, "");
  return prefix ? `${prefix}/${safe}` : safe;
}

async function uploadMulterBufferFile(multerFile) {
  assertS3Config();
  const { bucket } = readS3Env();
  const key = buildObjectKey(multerFile.originalname);
  const contentType = multerFile.mimetype || "video/mp4";

  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: multerFile.buffer,
      ContentType: contentType,
    })
  );
  return key;
}

async function deleteObjectKey(key) {
  if (!key || typeof key !== "string") return;
  assertS3Config();
  const { bucket } = readS3Env();
  try {
    await getClient().send(
      new DeleteObjectCommand({ Bucket: bucket, Key: key })
    );
  } catch (e) {
    console.warn("⚠  S3 o'chirish:", e.message);
  }
}

/**
 * Range qo'llab-quvvatlash; courseService bilan bir xil headerlar.
 */
async function streamVideoToResponse(key, req, res, { lessonTitle } = {}) {
  assertS3Config();
  const { bucket } = readS3Env();
  const client = getClient();

  let head;
  try {
    head = await client.send(
      new HeadObjectCommand({ Bucket: bucket, Key: key })
    );
  } catch (e) {
    const st = e.$metadata?.httpStatusCode;
    if (
      st === 404 ||
      e.name === "NotFound" ||
      e.name === "NoSuchKey" ||
      e.Code === "NotFound"
    ) {
      const err = new Error("Video fayl topilmadi");
      err.statusCode = 404;
      throw err;
    }
    throw e;
  }

  const fileSize = head.ContentLength;
  const mime = head.ContentType || "video/mp4";
  const download =
    req.query.download === "1" || req.query.download === "true";
  const ext = path.extname(key) || ".mp4";
  const baseName =
    String(lessonTitle || "video")
      .replace(/[^\w\s.-]/g, "_")
      .slice(0, 80) + ext;
  const disposition = download
    ? `attachment; filename*=UTF-8''${encodeURIComponent(baseName)}`
    : `inline; filename*=UTF-8''${encodeURIComponent(baseName)}`;

  const range = req.headers.range;

  const pipeWithError = (stream) => {
    stream.on("error", () => {
      if (!res.headersSent) res.status(500).end();
    });
    stream.pipe(res);
  };

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    let start = parseInt(parts[0], 10);
    let end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    if (Number.isNaN(start)) start = 0;
    if (Number.isNaN(end)) end = fileSize - 1;
    if (start >= fileSize || start > end) {
      res.status(416);
      res.set("Content-Range", `bytes */${fileSize}`);
      return res.end();
    }
    if (end >= fileSize) end = fileSize - 1;
    const chunksize = end - start + 1;

    const out = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
        Range: `bytes=${start}-${end}`,
      })
    );

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunksize,
      "Content-Type": mime,
      "Content-Disposition": disposition,
      "Cache-Control": "private, max-age=3600",
    });
    pipeWithError(out.Body);
  } else {
    const out = await client.send(
      new GetObjectCommand({ Bucket: bucket, Key: key })
    );

    res.writeHead(200, {
      "Content-Length": fileSize,
      "Content-Type": mime,
      "Accept-Ranges": "bytes",
      "Content-Disposition": disposition,
      "Cache-Control": "private, max-age=3600",
    });
    pipeWithError(out.Body);
  }
}

module.exports = {
  isS3VideoEnabled,
  validateS3EnvOrExit,
  assertS3Config,
  uploadMulterBufferFile,
  deleteObjectKey,
  streamVideoToResponse,
};
