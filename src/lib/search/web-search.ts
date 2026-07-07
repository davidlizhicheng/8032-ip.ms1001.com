import { decodeHtmlEntities } from "@/lib/content/decode-html";
import { searchWithExa } from "@/lib/search/exa-search";
import { searchWithFirecrawl } from "@/lib/search/firecrawl-search";
import { getConfiguredApiProviders } from "@/lib/search/search-providers";
import { searchWithTavilyPublic } from "@/lib/search/tavily-search";
import {
  isProviderDisabled,
  isQuotaOrRateLimitError,
  markProviderDisabled,
} from "@/lib/search/provider-guard";

export type SearchResult = {
  title: string;
  url: string;
  snippet: string;
  source?: string;
  provider: string;
};

export type WebSearchOptions = {
  limit?: number;
  type?: string;
  includeBaikeQuery?: boolean;
  /** 直接使用原始检索词，不拼接类型提示 */
  rawQuery?: string;
};

const USER_AGENT = "Mozilla/5.0 (compatible; BrandNet/1.0; +https://brandnet.local)";

function buildQuery(name: string, type?: string): string {
  const typeHint =
    type === "city"
      ? "城市 产业 定位"
      : type === "company"
        ? "企业 公司 品牌"
        : type === "person"
          ? "人物 企业家 简介"
          : type === "brand"
            ? "品牌 产品"
            : "";
  return [name, typeHint].filter(Boolean).join(" ").trim();
}

async function runProvider(
  name: string,
  fn: () => Promise<SearchResult[]>,
): Promise<SearchResult[]> {
  if (isProviderDisabled(name)) return [];
  try {
    return await fn();
  } catch (error) {
    if (isQuotaOrRateLimitError(error)) {
      markProviderDisabled(name);
    }
    console.warn(`[web-search] ${name} failed:`, error);
    return [];
  }
}

function mergeResults(
  merged: SearchResult[],
  seen: Set<string>,
  items: SearchResult[],
  limit: number,
) {
  for (const item of items) {
    if (merged.length >= limit) break;
    const key = item.url || item.title;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }
}

export async function searchWeb(
  name: string,
  options: WebSearchOptions = {},
): Promise<SearchResult[]> {
  const query = options.rawQuery || buildQuery(name, options.type);
  const limit = options.limit ?? 12;
  const includeBaike = options.includeBaikeQuery !== false && !options.rawQuery;

  const baikeQuery = `${name} site:baike.baidu.com`;
  const govQuery =
    options.type === "city"
      ? `${name} 人民政府 site:gov.cn`
      : options.type === "company"
        ? `${name} 官网`
        : `${name} 简介`;

  const searchTasks: Array<{ name: string; run: () => Promise<SearchResult[]> }> = [
    { name: "bing-cn", run: () => searchWithBingCn(query, limit) },
    { name: "duckduckgo", run: () => searchWithDuckDuckGo(query, limit) },
    { name: "brave", run: () => searchWithBrave(query, limit) },
    { name: "serper", run: () => searchWithSerper(query, limit) },
    { name: "exa", run: () => searchWithExa(query, limit) },
    { name: "firecrawl", run: () => searchWithFirecrawl(query, limit) },
    { name: "tavily", run: () => searchWithTavilyPublic(query, limit) },
  ];

  if (includeBaike) {
    searchTasks.unshift(
      { name: "bing-baike", run: () => searchWithBingCn(baikeQuery, 5) },
      { name: "bing-gov", run: () => searchWithBingCn(govQuery, 4) },
    );
  }

  const merged: SearchResult[] = [];
  const seen = new Set<string>();

  // 免费源并行，付费源串行，避免 Exa 429 / Firecrawl 402
  const freeTasks = searchTasks.filter((t) =>
    ["bing-cn", "bing-baike", "bing-gov", "duckduckgo", "brave", "serper"].includes(t.name),
  );
  const paidTasks = searchTasks.filter((t) => !freeTasks.includes(t));

  const freeResults = await Promise.all(freeTasks.map((t) => runProvider(t.name, t.run)));
  for (const list of freeResults) {
    mergeResults(merged, seen, list, limit);
  }

  for (const task of paidTasks) {
    if (merged.length >= limit) break;
    const list = await runProvider(task.name, task.run);
    mergeResults(merged, seen, list, limit);
  }

  return rankByAuthority(merged).slice(0, limit);
}

/** 多路检索：分批并行 query，避免付费 API 瞬时打满 */
export async function searchWebMulti(
  queries: string[],
  limitPerQuery = 8,
  totalLimit = 40,
): Promise<SearchResult[]> {
  const merged: SearchResult[] = [];
  const seen = new Set<string>();
  const batchSize = 3;

  for (let i = 0; i < queries.length; i += batchSize) {
    const batch = queries.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map((q) =>
        searchWeb(q, { rawQuery: q, limit: limitPerQuery, includeBaikeQuery: false }).catch(
          () => [] as SearchResult[],
        ),
      ),
    );

    for (const list of results) {
      for (const item of list) {
        const key = item.url || item.title;
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(item);
        if (merged.length >= totalLimit) break;
      }
      if (merged.length >= totalLimit) break;
    }
    if (merged.length >= totalLimit) break;
  }

  return rankByAuthority(merged).slice(0, totalLimit);
}

function rankByAuthority(results: SearchResult[]): SearchResult[] {
  return [...results].sort((a, b) => scoreUrl(b.url) - scoreUrl(a.url));
}

function scoreUrl(url: string): number {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host === "baike.baidu.com") return 100;
    if (host.endsWith(".gov.cn")) return 90;
    if (host.includes("people.com.cn") || host.includes("xinhuanet.com")) return 80;
    if (host.includes("wikipedia.org")) return 75;
    return 0;
  } catch {
    return 0;
  }
}

export function isWebSearchConfigured(): boolean {
  return Boolean(
    process.env.EXA_API_KEY ||
      process.env.BRAVE_SEARCH_API_KEY ||
      process.env.SERPER_API_KEY ||
      process.env.TAVILY_API_KEY ||
      process.env.JINA_API_KEY,
  );
}

export function getActiveSearchProviders(): string[] {
  const api = getConfiguredApiProviders();
  const providers = [...api];
  if (process.env.BRAVE_SEARCH_API_KEY) providers.push("brave");
  if (process.env.SERPER_API_KEY) providers.push("serper");
  if (providers.length === 0) providers.push("bing-cn", "duckduckgo");
  return providers;
}

export { searchWithExa, searchExaNews, fetchExaEvidence } from "@/lib/search/exa-search";
export {
  searchWithFirecrawl,
  fetchFirecrawlEvidence,
  scrapeWithFirecrawl,
} from "@/lib/search/firecrawl-search";
export { searchWithTavilyPublic, fetchTavilyEvidence } from "@/lib/search/tavily-search";
export {
  searchParallelProviders,
  fetchParallelEvidence,
  searchParallelMulti,
  getConfiguredApiProviders,
} from "@/lib/search/search-providers";

type BraveSearchOptions = {
  limit?: number;
  offset?: number;
  /** 仅新闻结果 */
  newsOnly?: boolean;
  country?: string;
  searchLang?: string;
};

/** Brave Search API — 独立索引，适合 AI 检索（需 BRAVE_SEARCH_API_KEY） */
export async function searchWithBrave(
  query: string,
  limit = 12,
  options: BraveSearchOptions = {},
): Promise<SearchResult[]> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) return [];

  const params = new URLSearchParams({
    q: query,
    count: String(Math.min(20, limit)),
    country: options.country || process.env.BRAVE_SEARCH_COUNTRY || "ALL",
    search_lang: options.searchLang || process.env.BRAVE_SEARCH_LANG || "zh-hans",
  });
  if (options.offset) params.set("offset", String(Math.min(9, options.offset)));
  if (options.newsOnly) params.set("result_filter", "news");

  const res = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "X-Subscription-Token": apiKey,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Brave Search ${res.status}${body ? `: ${body.slice(0, 120)}` : ""}`);
  }

  const data = (await res.json()) as {
    web?: { results?: Array<{ title?: string; url?: string; description?: string }> };
    news?: { results?: Array<{ title?: string; url?: string; description?: string }> };
  };

  const web = (data.web?.results || []).map((item) => ({
    title: item.title || "",
    url: item.url || "",
    snippet: item.description || "",
    source: item.url ? extractDomain(item.url) : "web",
    provider: "brave",
  }));

  const news = (data.news?.results || []).map((item) => ({
    title: item.title || "",
    url: item.url || "",
    snippet: item.description || "",
    source: item.url ? extractDomain(item.url) : "news",
    provider: "brave-news",
  }));

  const merged = options.newsOnly ? news : [...web, ...news];
  return merged.filter((item) => item.title && item.url).slice(0, limit);
}

/** Brave 新闻检索（Research Agent 专用） */
export async function searchBraveNews(query: string, limit = 15): Promise<SearchResult[]> {
  return searchWithBrave(query, limit, { newsOnly: true });
}

/** Brave LLM Context — 预抽取正文块，适合直接喂 Evidence Pack */
export async function fetchBraveLlmContext(
  query: string,
  options: { maxUrls?: number; maxTokens?: number } = {},
): Promise<Array<{ url: string; title: string; text: string }>> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) return [];

  const body = {
    q: query,
    country: process.env.BRAVE_SEARCH_COUNTRY || "ALL",
    search_lang: process.env.BRAVE_SEARCH_LANG || "zh-hans",
    count: options.maxUrls ?? 8,
    maximum_number_of_urls: options.maxUrls ?? 8,
    maximum_number_of_tokens: options.maxTokens ?? 4096,
    context_threshold_mode: "balanced",
  };

  const res = await fetch("https://api.search.brave.com/res/v1/llm/context", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Subscription-Token": apiKey,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) return [];

  const data = (await res.json()) as {
    grounding?: {
      generic?: Array<{ url?: string; title?: string; snippets?: string[] }>;
    };
  };

  const chunks: Array<{ url: string; title: string; text: string }> = [];
  for (const item of data.grounding?.generic || []) {
    if (!item.url) continue;
    const text = (item.snippets || []).join("\n").trim();
    if (text.length < 80) continue;
    chunks.push({
      url: item.url,
      title: item.title || item.url,
      text: text.slice(0, 12000),
    });
  }
  return chunks;
}

async function searchWithSerper(query: string, limit: number): Promise<SearchResult[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return [];

  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q: query, gl: "cn", hl: "zh-cn", num: limit }),
  });

  if (!res.ok) throw new Error(`Serper ${res.status}`);

  const data = (await res.json()) as {
    organic?: Array<{ title?: string; link?: string; snippet?: string }>;
  };

  return (data.organic || [])
    .filter((item) => item.title && item.link)
    .map((item) => ({
      title: item.title!,
      url: item.link!,
      snippet: item.snippet || "",
      source: extractDomain(item.link!),
      provider: "serper",
    }));
}

async function searchWithBingCn(query: string, limit: number): Promise<SearchResult[]> {
  const url = `https://cn.bing.com/search?q=${encodeURIComponent(query)}&setlang=zh-Hans`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
    },
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`Bing CN ${res.status}`);

  const html = await res.text();
  return parseBingHtml(html, limit);
}

function parseBingHtml(html: string, limit: number): SearchResult[] {
  const results: SearchResult[] = [];
  const seen = new Set<string>();

  const resultRegex =
    /<h2[^>]*><a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a><\/h2>\s*<div class="b_caption"><p[^>]*>([\s\S]*?)<\/p>/g;

  let match;
  while ((match = resultRegex.exec(html)) !== null && results.length < limit) {
    const url = match[1];
    const title = stripHtml(match[2]);
    const snippet = stripHtml(match[3]);

    if (!url.startsWith("http") || !title || seen.has(url)) continue;
    seen.add(url);

    results.push({
      title,
      url,
      snippet: snippet || title,
      source: extractDomain(url),
      provider: "bing-cn",
    });
  }

  return results;
}

async function searchWithDuckDuckGo(query: string, limit: number): Promise<SearchResult[]> {
  const body = new URLSearchParams({ q: query, kl: "cn-zh" });

  const res = await fetch("https://html.duckduckgo.com/html/", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
    },
    body: body.toString(),
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`DuckDuckGo ${res.status}`);

  const html = await res.text();
  return parseDuckDuckGoHtml(html, limit);
}

function parseDuckDuckGoHtml(html: string, limit: number): SearchResult[] {
  const results: SearchResult[] = [];
  const blockRegex = /<a rel="nofollow" class="result__a" href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  const snippetRegex = /<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;

  const links: Array<{ url: string; title: string }> = [];
  let match;
  while ((match = blockRegex.exec(html)) !== null) {
    links.push({
      url: decodeDuckDuckGoUrl(match[1]),
      title: stripHtml(match[2]),
    });
  }

  const snippets: string[] = [];
  while ((match = snippetRegex.exec(html)) !== null) {
    snippets.push(stripHtml(match[1]));
  }

  for (let i = 0; i < Math.min(links.length, limit); i++) {
    const link = links[i];
    if (!link.url || !link.title) continue;
    results.push({
      title: link.title,
      url: link.url,
      snippet: snippets[i] || link.title,
      source: extractDomain(link.url),
      provider: "duckduckgo",
    });
  }

  return results;
}

function decodeDuckDuckGoUrl(raw: string): string {
  try {
    const uddg = raw.match(/uddg=([^&]+)/)?.[1];
    if (uddg) return decodeURIComponent(uddg);
    if (raw.startsWith("http")) return raw;
  } catch {
    // fall through
  }
  return raw;
}

function stripHtml(value: string): string {
  return decodeHtmlEntities(
    value
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "web";
  }
}

export function formatSearchContext(results: SearchResult[]): string {
  if (!results.length) return "";

  return results
    .map(
      (item, index) =>
        `[资料 ${index + 1}] ${item.title}\n来源：${item.source || item.provider}\n链接：${item.url}\n摘要：${item.snippet}`,
    )
    .join("\n\n");
}
