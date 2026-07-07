/**
 * 统一检索层：Exa + Tavily + Firecrawl 并行检索、去重合并
 */

import type { SearchResult } from "@/lib/search/web-search";
import { fetchExaEvidence, isExaConfigured, searchWithExa } from "@/lib/search/exa-search";
import {
  fetchFirecrawlEvidence,
  isFirecrawlConfigured,
  searchWithFirecrawl,
} from "@/lib/search/firecrawl-search";
import {
  fetchTavilyEvidence,
  isTavilyConfigured,
  searchWithTavilyPublic,
} from "@/lib/search/tavily-search";

export type EvidenceChunk = {
  title: string;
  url: string;
  text: string;
  provider: string;
};

export type ProviderStatus = {
  name: string;
  configured: boolean;
};

export function getProviderStatuses(): ProviderStatus[] {
  return [
    { name: "exa", configured: isExaConfigured() },
    { name: "tavily", configured: isTavilyConfigured() },
    { name: "firecrawl", configured: isFirecrawlConfigured() },
  ];
}

export function getConfiguredApiProviders(): string[] {
  return getProviderStatuses()
    .filter((p) => p.configured)
    .map((p) => p.name);
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    return u.toString().replace(/\/$/, "");
  } catch {
    return url.split("?")[0];
  }
}

function dedupeSearchResults(items: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  const out: SearchResult[] = [];
  for (const item of items) {
    const key = normalizeUrl(item.url || item.title);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function dedupeEvidence(items: EvidenceChunk[]): EvidenceChunk[] {
  const seen = new Set<string>();
  const out: EvidenceChunk[] = [];
  for (const item of items) {
    const key = normalizeUrl(item.url);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export type ParallelSearchOptions = {
  limitPerProvider?: number;
  totalLimit?: number;
  exaCategory?: "news" | "company" | "people";
  tavilyTopic?: "general" | "news";
};

/** 三源并行搜索，按 URL 去重 */
export async function searchParallelProviders(
  query: string,
  options: ParallelSearchOptions = {},
): Promise<SearchResult[]> {
  const limit = options.limitPerProvider ?? 8;
  const tasks: Array<Promise<SearchResult[]>> = [];

  if (isExaConfigured()) {
    tasks.push(
      searchWithExa(query, limit, {
        category: options.exaCategory,
        userLocation: process.env.EXA_USER_LOCATION || "CN",
      }).catch(() => []),
    );
  }
  if (isTavilyConfigured()) {
    tasks.push(
      searchWithTavilyPublic(query, limit, { topic: options.tavilyTopic }).catch(() => []),
    );
  }
  if (isFirecrawlConfigured()) {
    tasks.push(searchWithFirecrawl(query, limit).catch(() => []));
  }

  const batches = await Promise.all(tasks);
  const merged = dedupeSearchResults(batches.flat());
  const total = options.totalLimit ?? 24;
  return merged.slice(0, total);
}

export type ParallelEvidenceOptions = {
  limitPerProvider?: number;
  exaCategory?: "news" | "company" | "people";
  tavilyTopic?: "general" | "news";
};

/** 三源并行证据抽取（highlights / advanced content / search+scrape） */
export async function fetchParallelEvidence(
  query: string,
  options: ParallelEvidenceOptions = {},
): Promise<EvidenceChunk[]> {
  const limit = options.limitPerProvider ?? 6;
  const tasks: Array<Promise<EvidenceChunk[]>> = [];

  if (isExaConfigured()) {
    tasks.push(
      fetchExaEvidence(query, {
        limit,
        category: options.exaCategory,
        userLocation: process.env.EXA_USER_LOCATION || "CN",
      }).catch(() => []),
    );
  }
  if (isTavilyConfigured()) {
    tasks.push(
      fetchTavilyEvidence(query, { limit, topic: options.tavilyTopic }).catch(() => []),
    );
  }
  if (isFirecrawlConfigured()) {
    tasks.push(fetchFirecrawlEvidence(query, { limit }).catch(() => []));
  }

  const batches = await Promise.all(tasks);
  return dedupeEvidence(batches.flat());
}

/** 多 query 并行 fan-out */
export async function searchParallelMulti(
  queries: string[],
  options: ParallelSearchOptions = {},
): Promise<SearchResult[]> {
  const perQuery = options.limitPerProvider ?? 6;
  const total = options.totalLimit ?? 40;
  const batches = await Promise.all(
    queries.map((q) =>
      searchParallelProviders(q, { ...options, limitPerProvider: perQuery, totalLimit: perQuery }),
    ),
  );
  return dedupeSearchResults(batches.flat()).slice(0, total);
}
