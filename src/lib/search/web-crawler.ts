/**
 * 第三通道：联网搜索 + 直接爬取网页正文（不依赖百科 API）。
 * 通道 1 = 百度百科；通道 2 = 维基 API；通道 3 = 本模块。
 */

import { cleanEncyclopediaText, looksLikeRawEncyclopediaDump } from "@/lib/content/source-clean";
import type { EnrichedSource } from "@/lib/search/baike-fetcher";
import { fetchPageExcerpt } from "@/lib/search/page-fetcher";
import { formatSearchContext, searchWebMulti, type SearchResult } from "@/lib/search/web-search";
import type { ResearchStep } from "@/lib/search/research-types";

const ENCYCLOPEDIA_HOSTS = [
  "baike.baidu.com",
  "wikipedia.org",
  "wikidata.org",
  "baike.com",
  "mbd.baidu.com",
];

const BLOCKED_CRAWL_HOSTS = [
  "zhidao.baidu.com",
  "tieba.baidu.com",
  "wenku.baidu.com",
  "image.baidu.com",
  "video.baidu.com",
  "music.baidu.com",
  "map.baidu.com",
  "login.",
  "passport.",
  "account.",
];

const TRUSTED_CRAWL_HOSTS = [
  "people.com.cn",
  "xinhuanet.com",
  "cctv.com",
  "gov.cn",
  "163.com",
  "sina.com.cn",
  "sohu.com",
  "ifeng.com",
  "thepaper.cn",
  "caixin.com",
  "36kr.com",
  "huxiu.com",
  "jiemian.com",
  "yicai.com",
  "stcn.com",
  "eeo.com.cn",
  "china.com.cn",
  "cnr.cn",
  "china daily",
];

export type WebCrawlOptions = {
  name: string;
  entityType: string;
  identityHint?: string;
  extraQueries?: string[];
  excludeKeywords?: string[];
  /** 最多爬取页面数，默认 8 */
  maxPages?: number;
  /** 并行抓取数 */
  concurrency?: number;
  onProgress?: (step: ResearchStep) => void;
};

export type WebCrawlResult = {
  searchResults: SearchResult[];
  crawledPages: EnrichedSource[];
  contextBlock: string;
  steps: ResearchStep[];
};

function emit(onProgress: WebCrawlOptions["onProgress"], step: ResearchStep) {
  onProgress?.(step);
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function isEncyclopediaUrl(url: string): boolean {
  const host = hostOf(url);
  return ENCYCLOPEDIA_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
}

function isBlockedCrawlUrl(url: string): boolean {
  const host = hostOf(url);
  if (!host) return true;
  if (isEncyclopediaUrl(url)) return true;
  return BLOCKED_CRAWL_HOSTS.some((b) => host.includes(b));
}

function matchesExclude(text: string, excludeKeywords: string[]): boolean {
  const lower = text.toLowerCase();
  return excludeKeywords.some((k) => lower.includes(k.toLowerCase()));
}

/** 网页直爬专用检索词（刻意不含 site:baike / site:wikipedia） */
export function buildWebCrawlQueries(
  name: string,
  entityType: string,
  identityHint?: string,
  extraQueries: string[] = [],
): string[] {
  const hint = identityHint?.trim();
  const hintQuery = hint && hint.length >= 4 ? `${name} ${hint}` : "";

  if (entityType === "person") {
    return [
      ...extraQueries,
      hintQuery,
      `${name} 简介 人物`,
      `${name} 传记 经历`,
      `${name} 企业家 创业 公司`,
      `${name} 采访 专访`,
      `${name} 演讲 观点`,
      `${name} 官方 简介`,
      `${name} 人物报道 深度`,
      `${name} 个人资料`,
      `"${name}" 职务 成就`,
      `${name} 新闻 site:people.com.cn`,
      `${name} site:xinhuanet.com`,
      `${name} site:cctv.com`,
      `${name} site:thepaper.cn`,
    ].filter(Boolean);
  }

  if (entityType === "city") {
    return [
      ...extraQueries,
      `${name} 城市 定位 产业`,
      `${name} 人民政府 site:gov.cn`,
      `${name} 招商 营商环境`,
      `${name} 代表企业`,
      `${name} 旅游 文化`,
      `${name} 经济发展 数据`,
    ];
  }

  if (entityType === "company") {
    return [
      ...extraQueries,
      `${name} 公司 企业 简介`,
      `${name} 创始人 产品`,
      `${name} 官网 品牌`,
      `${name} 业务 模式`,
      `${name} 新闻 报道`,
    ];
  }

  return [
    ...extraQueries,
    `${name} 简介`,
    `${name} 品牌 产品`,
    `${name} 新闻`,
  ].filter(Boolean);
}

export function scoreCrawlCandidate(
  result: SearchResult,
  name: string,
  identityHint?: string,
): number {
  if (isBlockedCrawlUrl(result.url)) return -100;

  let score = 0;
  const host = hostOf(result.url);
  const text = `${result.title} ${result.snippet}`;

  if (text.includes(name)) score += 5;
  if (identityHint) {
    for (const part of identityHint.split(/[·，,、]/).filter((p) => p.trim().length >= 2)) {
      if (text.includes(part.trim())) score += 2;
    }
  }

  if (host.endsWith(".gov.cn")) score += 12;
  if (TRUSTED_CRAWL_HOSTS.some((h) => host.includes(h))) score += 8;
  if (/简介|传记|人物|专访|报道|档案|介绍/.test(text)) score += 3;
  if (result.snippet.length >= 80) score += 2;
  if (/标签页|快讯|股价|涨停|身家|自媒体/.test(text)) score -= 6;

  return score;
}

async function crawlOnePage(
  candidate: SearchResult,
  name: string,
): Promise<EnrichedSource | null> {
  const page = await fetchPageExcerpt(candidate.url, candidate.title);
  if (!page) return null;

  const body = page.fullText || page.snippet || "";
  if (body.length < 100) return null;
  if (looksLikeRawEncyclopediaDump(body)) return null;
  if (!body.includes(name) && !candidate.title.includes(name)) {
    const nameChars = name.replace(/[·\s]/g, "");
    if (nameChars.length >= 2 && !body.includes(nameChars)) return null;
  }

  const cleanBody = cleanEncyclopediaText(body, "web");
  if (cleanBody.length < 100) return null;

  const host = hostOf(page.url);
  return {
    ...page,
    snippet: cleanBody.slice(0, 400),
    fullText: cleanBody.slice(0, 12000),
    provider: "web-crawl",
    sourceType: host.endsWith(".gov.cn") ? "gov" : "web",
    confidenceScore: host.endsWith(".gov.cn") ? 0.88 : 0.72,
  };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i], i);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

export function formatWebCrawlContext(pages: EnrichedSource[]): string {
  if (!pages.length) return "";
  return `【网页直爬 ${pages.length} 篇（第三通道：新闻/官网/权威报道正文）】\n${pages
    .map((p, i) => {
      const host = hostOf(p.url);
      return `[网页 ${i + 1}] ${p.title}\n来源：${host}（${p.url}）\n正文：\n${(p.fullText || p.snippet).slice(0, 4000)}`;
    })
    .join("\n\n")}`;
}

export async function crawlWebSources(options: WebCrawlOptions): Promise<WebCrawlResult> {
  const steps: ResearchStep[] = [];
  const maxPages = options.maxPages ?? 8;
  const concurrency = options.concurrency ?? 3;
  const excludeKeywords = options.excludeKeywords || [];

  emit(options.onProgress, {
    phase: "crawl",
    label: `第三通道：联网直爬「${options.name}」`,
    status: "running",
  });

  const queries = buildWebCrawlQueries(
    options.name,
    options.entityType,
    options.identityHint,
    options.extraQueries,
  );

  emit(options.onProgress, {
    phase: "crawl",
    label: `网页检索 ${queries.length} 组关键词`,
    detail: queries.slice(0, 4).join(" · "),
    status: "running",
  });

  const searchResults = await searchWebMulti(queries, 10, 50);
  const nonEncyclopedia = searchResults.filter(
    (r) =>
      !isBlockedCrawlUrl(r.url) &&
      !matchesExclude(`${r.title} ${r.snippet}`, excludeKeywords),
  );

  emit(options.onProgress, {
    phase: "crawl",
    label: `检索完成，${nonEncyclopedia.length} 条可爬链接（已排除百科）`,
    status: "done",
  });

  const ranked = [...nonEncyclopedia]
    .map((r) => ({ r, score: scoreCrawlCandidate(r, options.name, options.identityHint) }))
    .filter((x) => x.score >= 2)
    .sort((a, b) => b.score - a.score);

  const seen = new Set<string>();
  const candidates: SearchResult[] = [];
  for (const { r } of ranked) {
    const key = r.url.split("?")[0];
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push(r);
    if (candidates.length >= maxPages + 4) break;
  }

  emit(options.onProgress, {
    phase: "crawl",
    label: `开始爬取 ${Math.min(candidates.length, maxPages)} 个网页正文…`,
    status: "running",
  });

  const crawledPages: EnrichedSource[] = [];
  const toFetch = candidates.slice(0, maxPages + 2);

  const fetched = await mapWithConcurrency(toFetch, concurrency, async (candidate) => {
    emit(options.onProgress, {
      phase: "crawl",
      label: `爬取：${candidate.title.slice(0, 36)}…`,
      url: candidate.url,
      status: "running",
    });
    return crawlOnePage(candidate, options.name);
  });

  for (let i = 0; i < fetched.length; i++) {
    const page = fetched[i];
    const candidate = toFetch[i];
    if (page) {
      crawledPages.push(page);
      emit(options.onProgress, {
        phase: "crawl",
        label: `已爬取：${page.title.slice(0, 40)}`,
        url: page.url,
        detail: `${page.fullText?.length || 0} 字`,
        status: "done",
      });
    } else if (candidate) {
      emit(options.onProgress, {
        phase: "crawl",
        label: `跳过（无法解析）：${candidate.title.slice(0, 30)}`,
        url: candidate.url,
        status: "skipped",
      });
    }
    if (crawledPages.length >= maxPages) break;
  }

  const contextBlock =
    crawledPages.length > 0
      ? formatWebCrawlContext(crawledPages)
      : nonEncyclopedia.length > 0
        ? `【网页检索摘要（未能抓取正文，仅标题/摘要）】\n${formatSearchContext(nonEncyclopedia.slice(0, 12))}`
        : "";

  emit(options.onProgress, {
    phase: "crawl",
    label: `第三通道完成：${crawledPages.length} 篇正文，${nonEncyclopedia.length} 条检索`,
    detail: contextBlock ? `${contextBlock.length} 字上下文` : undefined,
    status: crawledPages.length ? "done" : "skipped",
  });

  return {
    searchResults: nonEncyclopedia,
    crawledPages,
    contextBlock,
    steps,
  };
}
