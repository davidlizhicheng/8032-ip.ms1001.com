/**
 * 联网图片搜索：Bing 图搜（无需 API Key）+ 可选百科配图
 */

import { fetchBaikeMediaForEntries } from "@/lib/search/baike-media";
import { fetchAllBaikeEntries } from "@/lib/search/baike-fetcher";
import {
  filterRelevantBrandImages,
  isLowQualityImageUrl,
  scoreBrandImageRelevance,
} from "@/lib/search/brand-image-relevance";
import {
  expandPersonSearchNames,
  getPersonImageEnglishName,
} from "@/lib/search/person-name-aliases";

export type ImageSearchHit = {
  url: string;
  title?: string;
  source: "bing" | "baike";
  query?: string;
};

export type ImageSearchOptions = {
  query: string;
  /** 与 query 二选一，用于品牌/人物智能扩展关键词 */
  brandName?: string;
  entityType?: "company" | "brand" | "person" | "city";
  limit?: number;
  /** 是否尝试百度百科配图 */
  includeBaike?: boolean;
};

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

export function normalizeImageUrl(raw: string, baseUrl?: string): string | null {
  let url = raw.replace(/&amp;/g, "&").trim();
  if (url.startsWith("//")) url = `https:${url}`;
  if (url.startsWith("/") && baseUrl) {
    try {
      url = new URL(url, baseUrl).toString();
    } catch {
      return null;
    }
  }
  if (!url.startsWith("http")) return null;
  if (/\.(svg|ico)(\?|$)/i.test(url)) return null;
  return url;
}

function parseBingHitsFromHtml(html: string, query: string, limit: number): ImageSearchHit[] {  const hits: ImageSearchHit[] = [];
  const seen = new Set<string>();

  // 优先解析带标题的 JSON 块（t = 图片标题，用于相关性过滤）
  const blockRe =
    /murl&quot;:&quot;(https?:[^&]+?)&quot;(?:[^}]{0,400}?t&quot;:&quot;([^&]*?)&quot;)?/g;
  for (const m of html.matchAll(blockRe)) {
    const url = normalizeImageUrl(m[1]);
    const title = m[2]?.replace(/\\u([\dA-Fa-f]{4})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16)),
    );
    if (!url || seen.has(url) || isLowQualityImageUrl(url)) continue;
    seen.add(url);
    hits.push({
      url,
      title: title?.trim() || undefined,
      source: "bing",
      query,
    });
    if (hits.length >= limit) return hits;
  }

  // 回退：仅 murl
  for (const m of html.matchAll(/murl&quot;:&quot;(https?:[^&]+?)&quot;/g)) {
    const url = normalizeImageUrl(m[1]);
    if (!url || seen.has(url) || isLowQualityImageUrl(url)) continue;
    seen.add(url);
    hits.push({ url, title: undefined, source: "bing", query });
    if (hits.length >= limit) break;
  }

  return hits;
}

function buildSearchQueries(name: string, entityType?: ImageSearchOptions["entityType"]): string[] {
  const n = name.trim();
  if (!n) return [];

  switch (entityType) {
    case "person": {
      const queries: string[] = [];
      const en = getPersonImageEnglishName(n);
      if (en) {
        queries.push(`${en} portrait`, `${en} official photo`, en);
      }
      for (const alias of expandPersonSearchNames(n)) {
        if (/[\u4e00-\u9fff]/.test(alias) && alias.length >= 3) {
          queries.push(`${alias} 人物 照片`);
        }
      }
      if (!queries.length) {
        queries.push(`${n} 人物 照片`, `${n} 官方 肖像`, `${n} portrait`);
      }
      return queries;
    }
    case "city":
      return [`${n} 城市 风景`, `${n} 航拍`, `${n} 地标`];
    case "brand":
    case "company":
      return [`${n} 企业 官方`, `${n} 品牌 门店`, `${n} logo 宣传`, `${n} 公司`];
    default:
      return [`${n} 品牌`, `${n} 官方 图片`, `${n}`];
  }
}

/** Bing 图片搜索（解析 murl 字段） */
export async function searchBingImages(
  query: string,
  limit = 12,
): Promise<ImageSearchHit[]> {
  const q = query.trim();
  if (!q) return [];

  try {
    const searchUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(q)}&setlang=en-US&first=1`;
    const res = await fetch(searchUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html",
        "Accept-Language": "en-US,en;q=0.9",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return [];

    const html = await res.text();
    return parseBingHitsFromHtml(html, q, limit);
  } catch {
    return [];
  }
}

async function searchBaikeImages(name: string, limit: number): Promise<ImageSearchHit[]> {
  try {
    const entries = await fetchAllBaikeEntries(name);
    if (!entries.length) return [];
    const media = await fetchBaikeMediaForEntries(entries.slice(0, 2));
    if (!media) return [];

    const hits: ImageSearchHit[] = [];
    const push = (url: string, title: string) => {
      const normalized = normalizeImageUrl(url);
      if (normalized && !hits.some((h) => h.url === normalized)) {
        hits.push({ url: normalized, title, source: "baike", query: name });
      }
    };

    if (media.coverUrl) push(media.coverUrl, `${name}百科封面`);
    for (const url of media.galleryUrls || []) {
      push(url, `${name}百科图`);
      if (hits.length >= limit) break;
    }
    return hits.slice(0, limit);
  } catch {
    return [];
  }
}

/** 综合图片搜索：百科（可选）+ 多组 Bing 关键词 */
export async function searchImages(options: ImageSearchOptions): Promise<ImageSearchHit[]> {
  const name = (options.brandName || options.query).trim();
  const limit = Math.min(Math.max(options.limit ?? 12, 1), 24);
  const seen = new Set<string>();
  const merged: ImageSearchHit[] = [];

  const add = (hits: ImageSearchHit[]) => {
    for (const hit of hits) {
      if (seen.has(hit.url)) continue;
      seen.add(hit.url);
      merged.push(hit);
      if (merged.length >= limit) return true;
    }
    return merged.length >= limit;
  };

  if (options.includeBaike !== false && /[\u4e00-\u9fff]/.test(name)) {
    add(await searchBaikeImages(name, Math.min(4, limit)));
  }

  const queries =
    options.query.trim() !== name
      ? [options.query.trim(), ...buildSearchQueries(name, options.entityType)]
      : buildSearchQueries(name, options.entityType);

  const perQuery = Math.max(4, Math.ceil((limit * 2) / queries.length));
  for (const q of queries) {
    if (add(await searchBingImages(q, perQuery))) break;
  }

  const brandName = options.brandName?.trim() || name;
  const filtered = filterRelevantBrandImages(brandName, merged);
  const ranked = filtered
    .map((hit) => ({ hit, score: scoreBrandImageRelevance(brandName, hit) }))
    .sort((a, b) => b.score - a.score)
    .map(({ hit }) => hit);

  return ranked.slice(0, limit);
}

/** @deprecated 兼容旧调用，仅返回 URL 列表 */
export async function searchBingImageUrls(query: string, limit = 4): Promise<string[]> {
  const hits = await searchBingImages(query, limit);
  return hits.map((h) => h.url);
}
