import { isLocalUploadUrl } from "@/lib/storage/public-url";

/** 入库/接口接受的图片地址：本站相对路径或 http(s) 外链 */
export function isValidStoredAssetUrl(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (isLocalUploadUrl(v) || v.startsWith("/api/uploads/")) return true;
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
