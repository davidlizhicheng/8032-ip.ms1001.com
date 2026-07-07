import { formatEnrichedSource, type EnrichedSource } from "@/lib/search/baike-fetcher";
import type { ResearchBundle } from "@/lib/search/research-types";

/** 仅百科/维基正文，供 AI 写人物百科式介绍，不含新闻与门户摘录 */
export function buildBaikeOnlyContext(
  baikeEntries: EnrichedSource[],
  wiki: EnrichedSource | null,
  maxChars = 28000,
): string {
  const blocks: string[] = [];

  for (const [i, entry] of baikeEntries.entries()) {
    if (!entry.fullText && !entry.snippet) continue;
    blocks.push(formatEnrichedSource(entry, i + 1));
  }

  if (wiki?.fullText || wiki?.snippet) {
    blocks.push(formatEnrichedSource(wiki, baikeEntries.length + 1));
  }

  let text = blocks.join("\n\n");
  if (text.length > maxChars) {
    text = `${text.slice(0, maxChars)}\n\n（百科资料已截断，优先保留前半部分）`;
  }
  return text;
}

export function pickPersonResearchContext(
  bundle: Pick<ResearchBundle, "baikeEntries" | "wiki" | "contextText"> & {
    webCrawlPages?: EnrichedSource[];
  },
): string {
  const webChars = (bundle.webCrawlPages || []).reduce(
    (n, p) => n + (p.fullText?.length || p.snippet?.length || 0),
    0,
  );
  if (webChars >= 300 && bundle.contextText?.trim()) {
    return bundle.contextText;
  }
  const baikeOnly = buildBaikeOnlyContext(bundle.baikeEntries, bundle.wiki);
  if (baikeOnly.trim().length >= 150 && bundle.contextText?.trim()) {
    return bundle.contextText;
  }
  if (baikeOnly.trim().length >= 150) {
    return baikeOnly;
  }
  if (bundle.wiki?.fullText) {
    return buildBaikeOnlyContext([], bundle.wiki);
  }
  return bundle.contextText || "";
}

export function baikeCharTotal(entries: EnrichedSource[], wiki: EnrichedSource | null): number {
  return (
    entries.reduce((n, e) => n + (e.fullText?.length || e.snippet?.length || 0), 0) +
    (wiki?.fullText?.length || wiki?.snippet?.length || 0)
  );
}
