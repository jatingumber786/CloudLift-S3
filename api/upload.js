import { randomUUID } from "node:crypto";
import { readFile, unlink } from "node:fs/promises";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import formidable from "formidable";

export const config = {
  api: {
    bodyParser: false,
  },
};

const {
  AWS_REGION,
  AWS_BUCKET_NAME,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_S3_PREFIX = "uploads",
  MAX_FILE_SIZE_BYTES = "10485760",
} = process.env;

const requiredEnvVars = [
  "AWS_REGION",
  "AWS_BUCKET_NAME",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
];

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

const parseForm = (req) =>
  new Promise((resolve, reject) => {
    const form = formidable({
      multiples: false,
      maxFileSize: Number(MAX_FILE_SIZE_BYTES),
    });

    form.parse(req, (error, fields, files) => {
      if (error) {
        reject(error);
        return;
      }

      resolve({ fields, files });
    });
  });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);

  if (missingEnvVars.length > 0) {
    return res.status(500).json({
      error: `Server is missing required AWS environment variables: ${missingEnvVars.join(", ")}`,
    });
  }

  let uploadedFile;

  try {
    const { files } = await parseForm(req);
    const file = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!file) {
      return res.status(400).json({
        error: "A file is required.",
      });
    }

    uploadedFile = file;

    const fileBuffer = await readFile(file.filepath);
    const sanitizedFileName = String(file.originalFilename || "upload.bin").replace(/[^a-zA-Z0-9._-]/g, "-");
    const prefix = AWS_S3_PREFIX.replace(/^\/+|\/+$/g, "");
    const objectKey = prefix
      ? `${prefix}/${randomUUID()}-${sanitizedFileName}`
      : `${randomUUID()}-${sanitizedFileName}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: AWS_BUCKET_NAME,
        Key: objectKey,
        Body: fileBuffer,
        ContentType: file.mimetype || "application/octet-stream",
      }),
    );

    const encodedKey = objectKey
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");

    const fileUrl = `https://${AWS_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${encodedKey}`;

    return res.status(200).json({
      objectKey,
      fileUrl,
    });
  } catch (error) {
    console.error("Vercel upload handler failed", error);

    if (error?.code === 1009 || error?.httpCode === 413) {
      return res.status(400).json({
        error: `File is too large. Maximum allowed size is ${MAX_FILE_SIZE_BYTES} bytes.`,
      });
    }

    return res.status(500).json({
      error: "Failed to upload file to S3.",
    });
  } finally {
    if (uploadedFile?.filepath) {
      await unlink(uploadedFile.filepath).catch(() => {});
    }
  }
}
