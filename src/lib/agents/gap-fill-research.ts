import type { EntityLockResult, EvidencePack, EvidenceSource, PipelineContext } from "@/lib/agents/types";
import { createStreamEmitter } from "@/lib/agents/stream-events";
import { readPage } from "@/lib/search/page-reader";
import {
  fetchBraveLlmContext,
  searchBraveNews,
} from "@/lib/search/web-search";
import { fetchParallelEvidence, searchParallelMulti } from "@/lib/search/search-providers";
import type { EnrichedSource } from "@/lib/search/baike-fetcher";
import { cleanEncyclopediaText } from "@/lib/content/source-clean";

function enrichedFromText(
  title: string,
  url: string,
  text: string,
  provider: string,
): EnrichedSource {
  const host = url.includes(".gov.cn") ? "gov" : "web";
  return {
    title,
    url,
    snippet: text.slice(0, 400),
    fullText: text,
    source: url,
    provider,
    sourceType: host === "gov" ? "gov" : "web",
    confidenceScore: provider.startsWith("brave")
      ? 0.82
      : provider.startsWith("exa")
        ? 0.86
        : provider.startsWith("firecrawl")
          ? 0.84
          : 0.72,
  };
}

/** Gap Check 补搜：针对缺失主题二次检索 + 正文抓取 */
export async function supplementEvidenceFromGaps(
  lock: EntityLockResult,
  pack: EvidencePack,
  ctx: PipelineContext = {},
): Promise<EvidenceSource[]> {
  if (!pack.gaps.length && pack.readyForWriting) return [];

  const stream = createStreamEmitter(ctx);
  const name = lock.name;
  const gapQueries = pack.gaps.flatMap((gap) => [
    `"${name}" ${gap}`,
    `${name} ${gap}`,
    `${name} ${gap} 新闻`,
  ]);

  stream.status(`资料缺口补搜：${pack.gaps.join("、")}`, "gap_check", {
    queries: gapQueries.slice(0, 6),
  });

  const extra: EnrichedSource[] = [];

  // Exa / Tavily / Firecrawl 并行补搜
  const hasApiProviders =
    process.env.EXA_API_KEY || process.env.TAVILY_API_KEY || process.env.FIRECRAWL_API_KEY;

  if (hasApiProviders) {
    for (const gap of pack.gaps.slice(0, 3)) {
      const hits = await fetchParallelEvidence(`${name} ${gap}`, {
        limitPerProvider: 4,
        exaCategory: "news",
        tavilyTopic: "news",
      });
      for (const h of hits) {
        extra.push(enrichedFromText(h.title, h.url, h.text, h.provider));
        stream.source({ title: h.title, url: h.url, provider: h.provider, charCount: h.text.length });
      }
    }
  } else if (process.env.BRAVE_SEARCH_API_KEY) {
    for (const gap of pack.gaps.slice(0, 3)) {
      const chunks = await fetchBraveLlmContext(`${name} ${gap}`, { maxUrls: 5, maxTokens: 3000 });
      for (const c of chunks) {
        extra.push(enrichedFromText(c.title, c.url, c.text, "brave-llm-context"));
        stream.source({ title: c.title, url: c.url, provider: "brave-llm-context", charCount: c.text.length });
      }
    }

    for (const gap of pack.gaps.slice(0, 2)) {
      const news = await searchBraveNews(`${name} ${gap}`, 8);
      for (const n of news.slice(0, 4)) {
        const page = await readPage(n.url, n.title);
        if (page.ok) {
          extra.push(enrichedFromText(page.title, page.url, page.text, "brave-news"));
        }
      }
    }
  }

  // 通用多路检索补搜
  const webHits = await searchParallelMulti(gapQueries.slice(0, 8), {
    limitPerProvider: 6,
    totalLimit: 24,
    exaCategory: "news",
    tavilyTopic: "news",
  });
  for (const hit of webHits.slice(0, 8)) {
    const page = await readPage(hit.url, hit.title);
    if (page.ok) {
      extra.push(enrichedFromText(page.title, page.url, page.text, hit.provider));
      stream.source({ title: page.title, url: page.url, provider: hit.provider, charCount: page.text.length });
    }
  }

  stream.status(`补搜完成：新增 ${extra.length} 条正文`, "gap_check");
  return extra
    .map((s) => {
      const raw = s.fullText || s.snippet || "";
      const text = cleanEncyclopediaText(raw, "web");
      if (text.length < 80) return null;
      return {
        id: `gap-${s.url}`,
        title: s.title,
        url: s.url,
        sourceType: s.sourceType === "gov" ? "gov" : "web",
        text: text.slice(0, 30000),
        charCount: text.length,
        qualityScore: s.confidenceScore ?? 0.7,
        relevanceScore: text.includes(name) ? 0.8 : 0.5,
        tags: pack.gaps.filter((g) => text.includes(g.slice(0, 2))),
        fetchedAt: new Date().toISOString(),
      } satisfies EvidenceSource;
    })
    .filter(Boolean) as EvidenceSource[];
}

export function mergeEvidencePacks(base: EvidencePack, added: EvidenceSource[]): EvidencePack {
  const seen = new Set(base.sources.map((s) => s.url.split("?")[0]));
  const merged = [...base.sources];
  for (const s of added) {
    const key = s.url.split("?")[0];
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(s);
  }
  merged.sort((a, b) => b.qualityScore - a.qualityScore);
  const highQualityCount = merged.filter((s) => s.qualityScore >= 0.6).length;
  const contextText = merged
    .slice(0, 12)
    .map(
      (s, i) =>
        `[证据 ${i + 1}] ${s.title}\n来源：${s.sourceType}（${s.url}）\n正文：\n${s.text.slice(0, 5000)}`,
    )
    .join("\n\n");

  return {
    ...base,
    sources: merged,
    highQualityCount,
    contextText,
    readyForWriting: highQualityCount >= 5,
    gaps: highQualityCount >= 5 ? [] : base.gaps,
  };
}
