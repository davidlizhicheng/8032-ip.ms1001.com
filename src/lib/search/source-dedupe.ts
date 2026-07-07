/** 资料来源去重（URL / 标题） */

export type SourceLike = {
  id?: string;
  title: string;
  url?: string | null;
  sourceType?: string;
  excerpt?: string | null;
  confidenceScore?: number;
};

function normalizeUrl(url?: string | null): string {
  if (!url?.trim()) return "";
  try {
    const u = new URL(url.trim());
    u.hash = "";
    u.search = "";
    return u.toString().replace(/\/$/, "");
  } catch {
    return url.trim().split("?")[0].replace(/\/$/, "");
  }
}

function normalizeTitle(title: string): string {
  return title
    .replace(/\s*[-–—|]\s*百度百科\s*$/i, "")
    .replace(/\s*_\s*百度百科\s*$/i, "")
    .replace(/\s+/g, "")
    .trim()
    .toLowerCase();
}

function sourceRank(s: SourceLike): number {
  const type = s.sourceType || "";
  if (type === "wiki") return 100;
  if (type === "official") return 90;
  if (type === "news") return 40;
  return 50;
}

/** 合并重复百科/同 URL 来源，保留置信度最高的一条 */
export function dedupeSources<T extends SourceLike>(sources: T[]): T[] {
  const byKey = new Map<string, T>();

  for (const src of sources) {
    const urlKey = normalizeUrl(src.url);
    const titleKey = normalizeTitle(src.title);
    const key = urlKey || titleKey || src.title;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, src);
      continue;
    }
    const existingScore = (existing.confidenceScore || 0) + sourceRank(existing);
    const nextScore = (src.confidenceScore || 0) + sourceRank(src);
    if (nextScore > existingScore) {
      byKey.set(key, src);
    }
  }

  return [...byKey.values()].sort(
    (a, b) => sourceRank(b) + (b.confidenceScore || 0) - sourceRank(a) - (a.confidenceScore || 0),
  );
}

export function formatSourceLabel(title: string, maxLen = 28): string {
  const cleaned = title
    .replace(/\s*[-–—|]\s*百度百科\s*$/i, "")
    .replace(/\s*_\s*百度百科\s*$/i, "")
    .trim();
  if (cleaned.length <= maxLen) return cleaned;
  return `${cleaned.slice(0, maxLen)}…`;
}
