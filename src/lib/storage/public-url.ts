/** 站点公网根 URL，用于把相对路径转为绝对地址（可选） */
export function getSiteBaseUrl(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/$/, "");
  }
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    "";
  return base.replace(/\/$/, "");
}

/** 本地 /uploads 走 API 路由，避免生产环境静态目录不可读 */
export function localUploadServePath(filename: string): string {
  return `/api/uploads/${filename}`;
}

const UPLOAD_PATH_RE = /^\/(?:api\/)?uploads\//i;

/** 是否为本站上传路径（相对或绝对） */
export function isLocalUploadUrl(url: string): boolean {
  const trimmed = url.trim();
  if (UPLOAD_PATH_RE.test(trimmed)) return true;
  try {
    const u = new URL(trimmed);
    return UPLOAD_PATH_RE.test(u.pathname);
  } catch {
    return false;
  }
}

/**
 * 统一为本站上传的相对路径 `/api/uploads/xxx`。
 * 外部 URL（百科、COS 等）原样返回。
 */
export function canonicalAssetPath(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (!UPLOAD_PATH_RE.test(parsed.pathname)) {
        return trimmed;
      }
      let path = parsed.pathname;
      if (path.startsWith("/uploads/")) {
        path = path.replace(/^\/uploads\//, "/api/uploads/");
      }
      return path;
    } catch {
      return trimmed;
    }
  }

  if (trimmed.startsWith("/uploads/")) {
    return trimmed.replace(/^\/uploads\//, "/api/uploads/");
  }
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export function toPublicAssetUrl(urlPath: string): string {
  const path = canonicalAssetPath(urlPath);
  if (!path) return path;
  if (/^https?:\/\//i.test(path)) return path;
  const base = getSiteBaseUrl();
  if (!base) return path;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** 展示用：兼容旧 /uploads/ 与绝对地址，相对路径在浏览器可直接加载 */
export function resolveAssetUrl(url?: string | null): string {
  if (!url?.trim()) return "";
  const path = canonicalAssetPath(url.trim());
  if (/^https?:\/\//i.test(path)) return path;
  return path;
}

/** 入库用：本站上传存相对路径；外链保持绝对 URL */
export function normalizeStoredAssetUrl(url?: string | null): string | undefined {
  if (!url?.trim()) return undefined;
  const trimmed = url.trim();
  if (isLocalUploadUrl(trimmed)) {
    return canonicalAssetPath(trimmed);
  }
  return trimmed;
}
