/**
 * Exa Search API — https://docs.exa.ai/reference/search-api-guide-for-coding-agents
 * Auth: x-api-key header. Default: type=auto + contents.highlights for agent workflows.
 */

import type { SearchResult } from "@/lib/search/web-search";
import { isProviderDisabled } from "@/lib/search/provider-guard";

let exaChain: Promise<unknown> = Promise.resolve();
let lastExaAt = 0;
const EXA_MIN_GAP_MS = 250;

async function withExaRateLimit<T>(fn: () => Promise<T>): Promise<T> {
  if (isProviderDisabled("exa")) {
    throw new Error("Exa temporarily disabled after rate limit");
  }
  const run = async () => {
    const wait = Math.max(0, EXA_MIN_GAP_MS - (Date.now() - lastExaAt));
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastExaAt = Date.now();
    return fn();
  };
  const result = exaChain.then(run, run);
  exaChain = result.catch(() => undefined);
  return result;
}

export type ExaSearchType =
  | "auto"
  | "fast"
  | "instant"
  | "deep-lite"
  | "deep"
  | "deep-reasoning";

export type ExaCategory =
  | "news"
  | "company"
  | "people"
  | "research paper"
  | "personal site"
  | "financial report";

export type ExaSearchOptions = {
  limit?: number;
  type?: ExaSearchType;
  category?: ExaCategory;
  includeDomains?: string[];
  excludeDomains?: string[];
  /** ISO country code, e.g. CN */
  userLocation?: string;
  /** Force livecrawl when cache older than N hours; 0 = always livecrawl */
  maxAgeHours?: number;
};

type ExaResult = {
  title?: string;
  url?: string;
  highlights?: string[];
  text?: string;
  summary?: string;
  publishedDate?: string;
};

function snippetFromResult(r: ExaResult): string {
  if (r.highlights?.length) return r.highlights.join("\n").slice(0, 600);
  if (r.summary) return r.summary.slice(0, 600);
  if (r.text) return r.text.slice(0, 600);
  return r.title || "";
}

function mapExaResults(results: ExaResult[], provider: string): SearchResult[] {
  return results
    .filter((r) => r.title && r.url)
    .map((r) => ({
      title: r.title!,
      url: r.url!,
      snippet: snippetFromResult(r),
      source: hostOf(r.url!),
      provider,
    }));
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "web";
  }
}

async function exaPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) throw new Error("EXA_API_KEY not configured");

  const res = await fetch(`https://api.exa.ai${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Exa ${path} ${res.status}${errText ? `: ${errText.slice(0, 200)}` : ""}`);
  }

  return res.json() as Promise<T>;
}

/** Raw retrieval + highlights — default agent pattern */
export async function searchWithExa(
  query: string,
  limit = 10,
  options: ExaSearchOptions = {},
): Promise<SearchResult[]> {
  if (!process.env.EXA_API_KEY) return [];

  const contents: Record<string, unknown> = { highlights: true };
  if (options.maxAgeHours !== undefined) {
    contents.maxAgeHours = options.maxAgeHours;
  }

  const body: Record<string, unknown> = {
    query,
    type: options.type || process.env.EXA_SEARCH_TYPE || "auto",
    numResults: Math.min(100, Math.max(1, limit)),
    contents,
  };

  if (options.category) body.category = options.category;
  if (options.includeDomains?.length) body.includeDomains = options.includeDomains;
  if (options.excludeDomains?.length) body.excludeDomains = options.excludeDomains;
  if (options.userLocation || process.env.EXA_USER_LOCATION) {
    body.userLocation = options.userLocation || process.env.EXA_USER_LOCATION;
  }

  const data = await withExaRateLimit(() => exaPost<{ results?: ExaResult[] }>("/search", body));
  return mapExaResults(data.results || [], "exa");
}

/** 新闻类检索 */
export async function searchExaNews(query: string, limit = 10): Promise<SearchResult[]> {
  return searchWithExa(query, limit, { category: "news", type: "auto" });
}

/** 人物类检索（Exa people category — 不支持 excludeDomains） */
export async function searchExaPeople(query: string, limit = 10): Promise<SearchResult[]> {
  return searchWithExa(query, limit, { category: "people", type: "auto" });
}

/** 带 highlights 的正文块，供 Evidence Pack 直接使用 */
export async function fetchExaEvidence(
  query: string,
  options: ExaSearchOptions = {},
): Promise<Array<{ title: string; url: string; text: string; provider: string }>> {
  if (!process.env.EXA_API_KEY) return [];

  const limit = options.limit ?? 8;
  const contents: Record<string, unknown> = { highlights: true };
  if (options.maxAgeHours !== undefined) contents.maxAgeHours = options.maxAgeHours;

  const data = await withExaRateLimit(() =>
    exaPost<{ results?: ExaResult[] }>("/search", {
      query,
      type: options.type || "auto",
      numResults: limit,
      category: options.category,
      userLocation: options.userLocation || process.env.EXA_USER_LOCATION,
      contents,
    }),
  );

  return (data.results || [])
    .filter((r) => r.url && (r.highlights?.length || r.text || r.summary))
    .map((r) => ({
      title: r.title || r.url!,
      url: r.url!,
      text: (r.highlights?.join("\n\n") || r.text || r.summary || "").slice(0, 12000),
      provider: "exa-highlights",
    }))
    .filter((r) => r.text.length >= 80);
}

/** 已知 URL 批量抽取正文（/contents） */
export async function fetchExaContents(
  urls: string[],
  options: { maxCharacters?: number; highlights?: boolean } = {},
): Promise<Array<{ url: string; title: string; text: string }>> {
  if (!process.env.EXA_API_KEY || !urls.length) return [];

  const body: Record<string, unknown> = { urls: urls.slice(0, 20) };
  if (options.highlights !== false) {
    body.highlights = true;
  } else {
    body.text = { maxCharacters: options.maxCharacters ?? 8000, verbosity: "compact" };
  }

  const data = await withExaRateLimit(() => exaPost<{ results?: ExaResult[] }>("/contents", body));

  return (data.results || [])
    .filter((r) => r.url)
    .map((r) => ({
      url: r.url!,
      title: r.title || r.url!,
      text: (r.highlights?.join("\n\n") || r.text || r.summary || "").slice(0, 12000),
    }))
    .filter((r) => r.text.length >= 80);
}

export function isExaConfigured(): boolean {
  return Boolean(process.env.EXA_API_KEY);
}
