/**
 * 品牌/人物/城市图片相关性判定：过滤与名称无关的搜索结果
 */

import {
  expandPersonSearchNames,
  getPersonImageEnglishName,
} from "@/lib/search/person-name-aliases";

const COMPANY_SUFFIX =
  /(股份有限公司|有限责任公司|有限公司|集团公司|集团|控股|科技|实业|品牌|官方|旗舰店|门店|公司)$/g;

const LOW_QUALITY =
  /avatar|icon|qrcode|banner-ad|emoji|1x1|pixel|spacer|loading\.gif|placeholder|default\.jpg/i;

const STOCK_SOURCES =
  /shutterstock|gettyimages|istockphoto|depositphotos|dreamstime|123rf|摄图网|包图网|千图网|昵图网|素材/i;

export function extractBrandTokens(name: string): string[] {
  const raw = name.trim();
  if (!raw) return [];

  const core = raw.replace(COMPANY_SUFFIX, "").trim();
  const tokens = new Set<string>();

  for (const t of [raw, core]) {
    if (t.length >= 2) tokens.add(t);
  }

  // 英文品牌取单词（Apple、Nike）
  for (const word of raw.split(/[\s·\-_/]+/)) {
    if (word.length >= 2) tokens.add(word);
  }

  // 中文 ≥2 字取前 2–4 字子串（≥3 字才取，避免「马斯克」→「马」误匹配）
  if (/[\u4e00-\u9fff]/.test(core) && core.length >= 3) {
    tokens.add(core.slice(0, Math.min(4, core.length)));
  }

  return [...tokens].filter((t) => t.length >= 2);
}

/** 图搜相关性 token：含人物英文名、百科别名 */
export function collectRelevanceTokens(brandName: string): string[] {
  const tokens = new Set(extractBrandTokens(brandName));

  const en = getPersonImageEnglishName(brandName);
  if (en) {
    for (const t of extractBrandTokens(en)) tokens.add(t);
  }

  for (const alias of expandPersonSearchNames(brandName)) {
    for (const t of extractBrandTokens(alias)) tokens.add(t);
  }

  return [...tokens].filter((t) => t.length >= 2);
}

export function isLowQualityImageUrl(url: string): boolean {
  return LOW_QUALITY.test(url);
}

export type BrandImageCandidate = {
  url: string;
  title?: string;
  source?: "bing" | "baike" | string;
};

/** 图片是否与品牌/实体名称相关 */
export function isRelevantBrandImage(
  brandName: string,
  hit: BrandImageCandidate,
): boolean {
  const name = brandName.trim();
  if (!name || !hit.url?.trim()) return false;
  if (isLowQualityImageUrl(hit.url)) return false;

  // 百科配图已在对应词条下抓取，视为相关
  if (hit.source === "baike") return true;

  const haystack = `${hit.title || ""} ${decodeURIComponent(hit.url)}`.toLowerCase();
  if (STOCK_SOURCES.test(haystack)) return false;

  const tokens = collectRelevanceTokens(name);
  if (!tokens.length) return false;

  // Bing 结果必须有真实标题或 URL 命中（不能用搜索词本身冒充标题）
  const titleHay = (hit.title || "").toLowerCase();
  const urlHay = hit.url.toLowerCase();

  const matched = tokens.some((token) => {
    const t = token.toLowerCase();
    if (/^[a-z0-9]+$/i.test(token)) {
      const re = new RegExp(`\\b${escapeRegExp(t)}\\b`, "i");
      return re.test(titleHay) || re.test(urlHay);
    }
    return titleHay.includes(t) || urlHay.includes(t);
  });

  if (!matched) return false;

  // logo 类图片：仅当搜索词含 logo 或品牌名较短时保留
  if (/logo/i.test(hit.url) && !/logo/i.test(name) && name.length > 4) {
    return false;
  }

  return true;
}

export function filterRelevantBrandImages<T extends BrandImageCandidate>(
  brandName: string,
  hits: T[],
): T[] {
  return hits.filter((h) => isRelevantBrandImage(brandName, h));
}

export function scoreBrandImageRelevance(
  brandName: string,
  hit: BrandImageCandidate,
): number {
  if (!isRelevantBrandImage(brandName, hit)) return 0;

  let score = 10;
  const tokens = collectRelevanceTokens(brandName);
  const title = (hit.title || "").toLowerCase();
  const url = hit.url.toLowerCase();

  for (const token of tokens) {
    const t = token.toLowerCase();
    if (title.includes(t)) score += 20;
    if (url.includes(t)) score += 10;
  }

  if (hit.source === "baike") score += 30;
  if (/官方|门店|宣传|product|store/i.test(title)) score += 5;

  return score;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
