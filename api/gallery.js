import { GetObjectCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const {
  AWS_REGION,
  AWS_BUCKET_NAME,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_S3_PREFIX = "uploads",
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
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);

  if (missingEnvVars.length > 0) {
    return res.status(500).json({
      error: `Server is missing required AWS environment variables: ${missingEnvVars.join(", ")}`,
    });
  }

  try {
    const prefix = AWS_S3_PREFIX.replace(/^\/+|\/+$/g, "");
    const result = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: AWS_BUCKET_NAME,
        Prefix: prefix || undefined,
        MaxKeys: 24,
      }),
    );

    const items = await Promise.all((result.Contents || [])
      .filter((item) => item.Key && /\.(png|jpe?g|gif|webp|bmp|svg|avif)$/i.test(item.Key))
      .sort((first, second) => {
        const firstTime = first.LastModified ? new Date(first.LastModified).getTime() : 0;
        const secondTime = second.LastModified ? new Date(second.LastModified).getTime() : 0;
        return secondTime - firstTime;
      })
      .map(async (item) => {
        const objectKey = item.Key;
        const previewUrl = await getSignedUrl(
          s3Client,
          new GetObjectCommand({
            Bucket: AWS_BUCKET_NAME,
            Key: objectKey,
          }),
          { expiresIn: 3600 },
        );

        return {
          objectKey,
          fileUrl: previewUrl,
          lastModified: item.LastModified ? new Date(item.LastModified).toISOString() : null,
        };
      }));

    return res.status(200).json({ items });
  } catch (error) {
    console.error("Vercel gallery handler failed", error);
    if (error?.name === "AccessDenied" || error?.Code === "AccessDenied") {
      return res.status(200).json({
        items: [],
        warning: "Gallery listing is blocked by AWS permissions.",
      });
    }

    return res.status(500).json({
      error: "Failed to load gallery items.",
    });
  }
}
