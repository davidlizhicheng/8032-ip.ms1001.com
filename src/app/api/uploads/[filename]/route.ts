import { readFile, stat } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getUploadDir } from "@/lib/storage/upload-dir";

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

type Params = { params: Promise<{ filename: string }> };

/** 本地 public/uploads 图片的稳定访问入口（生产环境 Nginx 反代时也可用） */
export async function GET(_request: Request, { params }: Params) {
  const { filename } = await params;
  const safe = path.basename(filename);
  if (!safe || safe !== filename) {
    return NextResponse.json({ error: "非法文件名" }, { status: 400 });
  }

  const filePath = path.join(getUploadDir(), safe);
  try {
    await stat(filePath);
    const buffer = await readFile(filePath);
    const ext = safe.split(".").pop()?.toLowerCase() || "jpg";
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": MIME[ext] || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "文件不存在" }, { status: 404 });
  }
}
