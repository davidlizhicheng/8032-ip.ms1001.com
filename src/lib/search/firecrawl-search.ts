/**
 * Firecrawl API v2 — search + scrape
 * https://docs.firecrawl.dev/api-reference/endpoint/search
 */

import type { SearchResult } from "@/lib/search/web-search";

type FirecrawlHit = {
  url?: string;
  title?: string;
  description?: string;
  markdown?: string;
  category?: string;
};

type FirecrawlSearchData = {
  web?: FirecrawlHit[];
  news?: FirecrawlHit[];
  images?: FirecrawlHit[];
};

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "web";
  }
}

async function firecrawlPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY not configured");

  const res = await fetch(`https://api.firecrawl.dev/v2${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Firecrawl ${path} ${res.status}${errText ? `: ${errText.slice(0, 200)}` : ""}`);
  }

  return res.json() as Promise<T>;
}

function flattenHits(data: FirecrawlSearchData): FirecrawlHit[] {
  return [...(data.web || []), ...(data.news || [])];
}

function mapHits(hits: FirecrawlHit[], provider: string): SearchResult[] {
  return hits
    .filter((h) => h.title && h.url)
    .map((h) => ({
      title: h.title!,
      url: h.url!,
      snippet: (h.markdown || h.description || "").slice(0, 600),
      source: hostOf(h.url!),
      provider,
    }));
}

export type FirecrawlSearchOptions = {
  limit?: number;
  /** 是否同时抓取 markdown 正文 */
  withMarkdown?: boolean;
  sources?: Array<"web" | "news">;
  /** ISO country code */
  country?: string;
};

/** Firecrawl 搜索 — 可选附带 markdown 正文 */
export async function searchWithFirecrawl(
  query: string,
  limit = 10,
  options: FirecrawlSearchOptions = {},
): Promise<SearchResult[]> {
  if (!process.env.FIRECRAWL_API_KEY) return [];

  const sources = (options.sources || ["web", "news"]).map((t) => ({ type: t }));
  const body: Record<string, unknown> = {
    query,
    limit: Math.min(20, Math.max(1, limit)),
    sources,
    ignoreInvalidURLs: true,
  };

  if (options.country || process.env.FIRECRAWL_COUNTRY) {
    body.country = options.country || process.env.FIRECRAWL_COUNTRY;
  }

  if (options.withMarkdown) {
    body.scrapeOptions = {
      formats: ["markdown"],
      onlyMainContent: true,
    };
  }

  const data = await firecrawlPost<{ success?: boolean; data?: FirecrawlSearchData }>(
    "/search",
    body,
  );
  return mapHits(flattenHits(data.data || {}), "firecrawl");
}

/** 搜索并返回 markdown 证据块 */
export async function fetchFirecrawlEvidence(
  query: string,
  options: FirecrawlSearchOptions = {},
): Promise<Array<{ title: string; url: string; text: string; provider: string }>> {
  if (!process.env.FIRECRAWL_API_KEY) return [];

  const limit = options.limit ?? 8;
  const sources = (options.sources || ["web", "news"]).map((t) => ({ type: t }));

  const data = await firecrawlPost<{ success?: boolean; data?: FirecrawlSearchData }>(
    "/search",
    {
      query,
      limit: Math.min(20, limit),
      sources,
      ignoreInvalidURLs: true,
      country: options.country || process.env.FIRECRAWL_COUNTRY,
      scrapeOptions: {
        formats: ["markdown"],
        onlyMainContent: true,
      },
    },
  );

  return flattenHits(data.data || {})
    .filter((h) => h.url && (h.markdown || h.description))
    .map((h) => ({
      title: h.title || h.url!,
      url: h.url!,
      text: (h.markdown || h.description || "").slice(0, 12000),
      provider: "firecrawl",
    }))
    .filter((r) => r.text.length >= 80);
}

/** 单 URL 正文抽取 */
export async function scrapeWithFirecrawl(url: string): Promise<string | null> {
  if (!process.env.FIRECRAWL_API_KEY) return null;

  try {
    const data = await firecrawlPost<{ success?: boolean; data?: { markdown?: string } }>(
      "/scrape",
      {
        url,
        formats: ["markdown"],
        onlyMainContent: true,
      },
    );
    const md = data.data?.markdown?.trim();
    return md && md.length >= 100 ? md : null;
  } catch {
    return null;
  }
}

export function isFirecrawlConfigured(): boolean {
  return Boolean(process.env.FIRECRAWL_API_KEY);
}
