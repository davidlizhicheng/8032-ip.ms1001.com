import type { NewsItem } from "@/lib/news/fetcher";
import type { SearchResult } from "@/lib/search/web-search";
import type { EnrichedSource } from "@/lib/search/baike-fetcher";

export type ResearchStep = {
  phase: "search" | "baike" | "wiki" | "news" | "page" | "crawl" | "merge" | "ai";
  label: string;
  detail?: string;
  url?: string;
  status: "running" | "done" | "skipped" | "error";
};

export type ResearchBundle = {
  news: NewsItem[];
  webResults: SearchResult[];
  baikeEntries: EnrichedSource[];
  wiki: EnrichedSource | null;
  /** 第三通道：网页直爬正文 */
  webCrawlPages: EnrichedSource[];
  pageExcerpts: EnrichedSource[];
  contextText: string;
  sourceCount: number;
  steps: ResearchStep[];
};

export type ResearchProgressCallback = (step: ResearchStep) => void;
