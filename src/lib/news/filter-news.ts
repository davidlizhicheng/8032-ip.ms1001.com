import type { NewsItem } from "@/lib/news/fetcher";

const PLACEHOLDER_NEWS = [
  /待抓取/,
  /相关.*动态（待/,
  /^关于.*的公开新闻报道整理/,
];

export function isPlaceholderNewsItem(news: {
  title?: string | null;
  excerpt?: string | null;
}): boolean {
  const text = `${news.title} ${news.excerpt || ""}`;
  return PLACEHOLDER_NEWS.some((p) => p.test(text));
}

export function filterRealNews(news: NewsItem[]): NewsItem[] {
  return news.filter((n) => n.title?.trim() && n.url?.trim() && !isPlaceholderNewsItem(n));
}
