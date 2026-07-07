import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import {
  localUploadServePath,
  normalizeStoredAssetUrl,
} from "@/lib/storage/public-url";
import { getUploadDir } from "@/lib/storage/upload-dir";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
const MAX_SIZE = 5 * 1024 * 1024;

const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function resolveMime(file: File): string {
  const type = (file.type || "").toLowerCase();
  if (ALLOWED_TYPES.includes(type)) {
    return type === "image/jpg" ? "image/jpeg" : type;
  }
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  return EXT_TO_MIME[ext] || type;
}

function extFromMime(mime: string): string {
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  return "jpg";
}

function cosFullyConfigured(): boolean {
  return Boolean(
    process.env.COS_REGION &&
      process.env.COS_ENDPOINT &&
      process.env.COS_SECRET_ID &&
      process.env.COS_SECRET_KEY &&
      process.env.COS_BUCKET &&
      process.env.COS_PUBLIC_URL,
  );
}

function getS3Client() {
  if (!cosFullyConfigured()) return null;

  return new S3Client({
    region: process.env.COS_REGION!,
    endpoint: process.env.COS_ENDPOINT!,
    credentials: {
      accessKeyId: process.env.COS_SECRET_ID!,
      secretAccessKey: process.env.COS_SECRET_KEY!,
    },
    forcePathStyle: true,
  });
}

export function validateImageFile(file: File) {
  const mime = resolveMime(file);
  if (!mime.startsWith("image/") || !Object.values(EXT_TO_MIME).includes(mime)) {
    throw new Error("仅支持 jpg、png、webp 格式");
  }
  if (file.size > MAX_SIZE) {
    throw new Error("图片大小不能超过 5MB");
  }
}

export async function uploadImage(file: File): Promise<string> {
  validateImageFile(file);

  const mime = resolveMime(file);
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = extFromMime(mime);
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const s3 = getS3Client();
  const bucket = process.env.COS_BUCKET;

  if (s3 && bucket) {
    const key = `uploads/${filename}`;
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: mime,
        ACL: "public-read",
      }),
    );

    const publicBase = process.env.COS_PUBLIC_URL!.replace(/\/$/, "");
    return `${publicBase}/${key}`;
  }

  const uploadDir = getUploadDir();
  await mkdir(uploadDir, { recursive: true });
  const localPath = path.join(uploadDir, filename);
  await writeFile(localPath, buffer);
  return normalizeStoredAssetUrl(localUploadServePath(filename))!;
}
