import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

dotenv.config();

const {
  AWS_REGION,
  AWS_BUCKET_NAME,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_S3_PREFIX = "uploads",
  ALLOWED_ORIGIN = "http://localhost:8080",
  MAX_FILE_SIZE_BYTES = "10485760",
  PORT = "3001",
} = process.env;

const requiredEnvVars = [
  "AWS_REGION",
  "AWS_BUCKET_NAME",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
];

const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);

if (missingEnvVars.length > 0) {
  console.warn(
    `Missing AWS configuration: ${missingEnvVars.join(", ")}. Upload requests will fail until these are set.`,
  );
}

const app = express();
const maxFileSizeBytes = Number(MAX_FILE_SIZE_BYTES);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxFileSizeBytes,
  },
});

const s3Client = new S3Client({
  region: AWS_REGION,
  credentials:
    AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: AWS_ACCESS_KEY_ID,
          secretAccessKey: AWS_SECRET_ACCESS_KEY,
        }
      : undefined,
});

app.use(
  cors({
    origin: ALLOWED_ORIGIN.split(",").map((origin) => origin.trim()),
  }),
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    if (missingEnvVars.length > 0) {
      return res.status(500).json({
        error: `Server is missing required AWS environment variables: ${missingEnvVars.join(", ")}`,
      });
    }

    const file = req.file;

    if (!file) {
      return res.status(400).json({
        error: "A file is required.",
      });
    }

    if (Number(file.size) > maxFileSizeBytes) {
      return res.status(400).json({
        error: `File is too large. Maximum allowed size is ${maxFileSizeBytes} bytes.`,
      });
    }

    const sanitizedFileName = String(file.originalname).replace(/[^a-zA-Z0-9._-]/g, "-");
    const prefix = AWS_S3_PREFIX.replace(/^\/+|\/+$/g, "");
    const objectKey = prefix
      ? `${prefix}/${randomUUID()}-${sanitizedFileName}`
      : `${randomUUID()}-${sanitizedFileName}`;

    await s3Client.send(
      new PutObjectCommand({
      Bucket: AWS_BUCKET_NAME,
      Key: objectKey,
      Body: file.buffer,
      ContentType: file.mimetype || "application/octet-stream",
    }),
    );

    const encodedKey = objectKey
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");

    const fileUrl = `https://${AWS_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${encodedKey}`;

    return res.json({
      objectKey,
      fileUrl,
    });
  } catch (error) {
    console.error("Failed to upload file to S3", error);
    return res.status(500).json({
      error: "Failed to upload file to S3.",
    });
  }
});

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        error: `File is too large. Maximum allowed size is ${maxFileSizeBytes} bytes.`,
      });
    }

    return res.status(400).json({
      error: error.message,
    });
  }

  console.error("Unhandled server error", error);
  return res.status(500).json({
    error: "Unexpected server error.",
  });
});

app.listen(Number(PORT), () => {
  console.log(`S3 upload server is running on http://localhost:${PORT}`);
});
