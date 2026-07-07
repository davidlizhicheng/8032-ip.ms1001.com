/**
 * Tavily Search API — 面向 AI Agent 的检索与正文摘要
 * https://docs.tavily.com/
 */

import type { SearchResult } from "@/lib/search/web-search";

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "web";
  }
}

export type TavilySearchOptions = {
  limit?: number;
  /** basic | advanced — advanced 返回更长正文片段 */
  searchDepth?: "basic" | "advanced";
  topic?: "general" | "news";
};

async function tavilySearch(
  query: string,
  options: TavilySearchOptions = {},
): Promise<Array<{ title: string; url: string; content: string }>> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: options.searchDepth || "advanced",
      max_results: Math.min(20, options.limit ?? 10),
      include_answer: false,
      topic: options.topic,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Tavily ${res.status}${errText ? `: ${errText.slice(0, 200)}` : ""}`);
  }

  const data = (await res.json()) as {
    results?: Array<{ title?: string; url?: string; content?: string }>;
  };

  return (data.results || [])
    .filter((r) => r.title && r.url)
    .map((r) => ({
      title: r.title!,
      url: r.url!,
      content: r.content || "",
    }));
}

export async function searchWithTavilyPublic(
  query: string,
  limit = 10,
  options: TavilySearchOptions = {},
): Promise<SearchResult[]> {
  const rows = await tavilySearch(query, { ...options, limit });
  return rows.map((r) => ({
    title: r.title,
    url: r.url,
    snippet: r.content.slice(0, 600),
    source: hostOf(r.url),
    provider: options.topic === "news" ? "tavily-news" : "tavily",
  }));
}

/** Tavily 正文证据 — advanced 深度检索 */
export async function fetchTavilyEvidence(
  query: string,
  options: TavilySearchOptions = {},
): Promise<Array<{ title: string; url: string; text: string; provider: string }>> {
  const rows = await tavilySearch(query, { ...options, searchDepth: "advanced" });
  return rows
    .filter((r) => r.content.length >= 80)
    .map((r) => ({
      title: r.title,
      url: r.url,
      text: r.content.slice(0, 12000),
      provider: options.topic === "news" ? "tavily-news" : "tavily",
    }));
}

export function isTavilyConfigured(): boolean {
  return Boolean(process.env.TAVILY_API_KEY);
}
