import path from "path";

/** 本地上传目录（默认 public/uploads，生产可通过 UPLOAD_DIR 指定绝对路径） */
export function getUploadDir(): string {
  const custom = process.env.UPLOAD_DIR?.trim();
  if (custom) {
    return path.isAbsolute(custom) ? custom : path.join(process.cwd(), custom);
  }
  return path.join(process.cwd(), "public", "uploads");
}
