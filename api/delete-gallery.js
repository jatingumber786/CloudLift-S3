import { DeleteObjectsCommand, S3Client } from "@aws-sdk/client-s3";

const {
  AWS_REGION,
  AWS_BUCKET_NAME,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
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

export default async function handler(req, res) {
  if (req.method !== "DELETE") {
    res.setHeader("Allow", "DELETE");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);

  if (missingEnvVars.length > 0) {
    return res.status(500).json({
      error: `Server is missing required AWS environment variables: ${missingEnvVars.join(", ")}`,
    });
  }

  try {
    const objectKeys = Array.isArray(req.body?.objectKeys) ? req.body.objectKeys.filter(Boolean) : [];

    if (objectKeys.length === 0) {
      return res.status(400).json({
        error: "At least one object key is required.",
      });
    }

    await s3Client.send(
      new DeleteObjectsCommand({
        Bucket: AWS_BUCKET_NAME,
        Delete: {
          Objects: objectKeys.map((Key) => ({ Key })),
          Quiet: false,
        },
      }),
    );

    return res.status(200).json({
      deleted: objectKeys,
    });
  } catch (error) {
    console.error("Vercel gallery delete handler failed", error);
    return res.status(500).json({
      error: "Failed to delete gallery items.",
    });
  }
}
