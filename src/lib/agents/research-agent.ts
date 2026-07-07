import type { EntityLockResult, PipelineContext, ResearchPlan } from "@/lib/agents/types";
import { buildResearchPlan, planSearchQueries } from "@/lib/agents/research-plan";
import { createStreamEmitter } from "@/lib/agents/stream-events";
import { gatherDeepResearch } from "@/lib/search/gather-deep-research";
import { crawlWebSources } from "@/lib/search/web-crawler";
import { fetchBraveLlmContext } from "@/lib/search/web-search";
import { fetchParallelEvidence } from "@/lib/search/search-providers";
import { fetchPersonFacts } from "@/lib/pipeline/person-content-pipeline";
import { fetchBaikeFromUrl, fetchWikiFromUrl } from "@/lib/search/baike-fetcher";
import { readPage } from "@/lib/search/page-reader";
import type { EnrichedSource } from "@/lib/search/baike-fetcher";
import type { ResearchBundle } from "@/lib/search/research-types";

export type RawResearchResult = {
  plan: ResearchPlan;
  bundle: ResearchBundle;
  /** 经 PageReader 深抓的正文页 */
  deepPages: EnrichedSource[];
};

async function fetchPersonResearch(lock: EntityLockResult, plan: ResearchPlan, ctx: PipelineContext) {
  const stream = createStreamEmitter(ctx);
  const factBundle = await fetchPersonFacts({
    name: lock.name,
    identityHint: lock.identityHint || "",
    confirmedBaikeUrl: lock.baikeUrl,
    confirmedWikiUrl: lock.wikiUrl,
    onStep: (s) => stream.status(s.label, "fetch", { detail: s.detail }),
  });

  return {
    news: [],
    webResults: [],
    baikeEntries: factBundle.baikeEntries,
    wiki: factBundle.wiki,
    webCrawlPages: factBundle.webCrawlPages,
    pageExcerpts: factBundle.webCrawlPages,
    contextText: "",
    sourceCount: factBundle.sourceCount,
    steps: [],
  } satisfies ResearchBundle;
}

/** 资料采集 Agent：Research Plan → 多源搜索 → 正文抓取 */
export async function runResearchAgent(
  lock: EntityLockResult,
  ctx: PipelineContext = {},
): Promise<RawResearchResult> {
  const stream = createStreamEmitter(ctx);
  const plan = buildResearchPlan(lock.name, lock.type, lock.identityHint);

  stream.status(`已生成检索计划：${plan.queries.length} 组关键词`, "research_plan", {
    requiredTopics: plan.requiredTopics,
  });

  const preFetchedChunks: EnrichedSource[] = [];
  const hasApiProviders =
    process.env.EXA_API_KEY || process.env.TAVILY_API_KEY || process.env.FIRECRAWL_API_KEY;

  if (hasApiProviders) {
    stream.status("Exa / Tavily / Firecrawl 并行预抽取证据…", "search");
    const evidenceQuery =
      lock.type === "person"
        ? `${lock.name} ${lock.identityHint || "biography career news"}`
        : plan.queries.slice(0, 2).map((q) => q.query).join(" ") || lock.name;

    const hits = await fetchParallelEvidence(evidenceQuery, {
      limitPerProvider: 6,
      exaCategory:
        lock.type === "person" ? "people" : lock.type === "company" ? "company" : undefined,
      tavilyTopic: lock.type === "person" || lock.type === "company" ? "news" : "general",
    });

    for (const c of hits) {
      preFetchedChunks.push({
        title: c.title,
        url: c.url,
        snippet: c.text.slice(0, 400),
        fullText: c.text,
        source: c.url,
        provider: c.provider,
        sourceType: c.url.includes(".gov.cn") ? "gov" : "web",
        confidenceScore: c.provider.startsWith("exa")
          ? 0.86
          : c.provider.startsWith("firecrawl")
            ? 0.84
            : 0.82,
      });
      stream.source({ title: c.title, url: c.url, provider: c.provider, charCount: c.text.length });
    }
  } else if (process.env.BRAVE_SEARCH_API_KEY) {
    stream.status("Brave LLM Context 预抽取正文…", "search");
    const chunks = await fetchBraveLlmContext(
      plan.queries.slice(0, 3).map((q) => q.query).join(" ") || lock.name,
      { maxUrls: 8, maxTokens: 6000 },
    );
    for (const c of chunks) {
      preFetchedChunks.push({
        title: c.title,
        url: c.url,
        snippet: c.text.slice(0, 400),
        fullText: c.text,
        source: c.url,
        provider: "brave-llm-context",
        sourceType: c.url.includes(".gov.cn") ? "gov" : "web",
        confidenceScore: 0.85,
      });
      stream.source({ title: c.title, url: c.url, provider: "brave-llm-context", charCount: c.text.length });
    }
  }

  let bundle: ResearchBundle;

  if (lock.type === "person") {
    stream.status("执行人物多通道检索（百科 + 维基 + 网页直爬）…", "search");
    bundle = await fetchPersonResearch(lock, plan, ctx);
  } else {
    stream.status(`执行 ${lock.type} 深度检索…`, "search");
    bundle = await gatherDeepResearch(lock.name, lock.type, {
      fetchNews: true,
      extraQueries: planSearchQueries(plan, 30),
      excludeKeywords: [],
      onProgress: (step) => stream.status(step.label, step.phase === "crawl" ? "fetch" : "search", { detail: step.detail, url: step.url }),
    });

    // 第三通道补充
    if (bundle.webCrawlPages.length < 3) {
      stream.status("启动网页直爬第三通道…", "fetch");
      const crawl = await crawlWebSources({
        name: lock.name,
        entityType: lock.type,
        identityHint: lock.identityHint,
        extraQueries: planSearchQueries(plan, 15),
        maxPages: 6,
        onProgress: (step) => stream.status(step.label, "fetch", { detail: step.detail }),
      });
      bundle.webCrawlPages = [...bundle.webCrawlPages, ...crawl.crawledPages];
      bundle.pageExcerpts = [...bundle.pageExcerpts, ...crawl.crawledPages];
    }
  }

  if (preFetchedChunks.length) {
    bundle.webCrawlPages = [...preFetchedChunks, ...bundle.webCrawlPages];
    bundle.pageExcerpts = [...preFetchedChunks, ...bundle.pageExcerpts];
    bundle.sourceCount += preFetchedChunks.length;
  }

  // 百科 URL 锁定
  if (lock.baikeUrl) {
    const pinned = await fetchBaikeFromUrl(lock.baikeUrl, lock.name);
    if (pinned) {
      bundle.baikeEntries = [pinned, ...bundle.baikeEntries.filter((e) => e.url !== pinned.url)];
    }
  }
  if (lock.wikiUrl) {
    const wikiPinned = await fetchWikiFromUrl(lock.wikiUrl, lock.name);
    if (wikiPinned) bundle.wiki = wikiPinned;
  }

  stream.status(
    `检索完成：百科 ${bundle.baikeEntries.length} · 网页 ${bundle.webCrawlPages.length} · 新闻 ${bundle.news.length}`,
    "fetch",
    { sourceCount: bundle.sourceCount },
  );

  // PageReader 深抓：对尚未有正文的搜索结果补抓
  const deepPages: EnrichedSource[] = [];
  const candidates = [
    ...bundle.webCrawlPages,
    ...bundle.pageExcerpts,
    ...bundle.baikeEntries,
    ...(bundle.wiki ? [bundle.wiki] : []),
  ];

  const needDeep = bundle.webResults
    .filter((r) => !r.url.includes("baike.baidu.com"))
    .slice(0, 6);

  let fetched = 0;
  for (const candidate of needDeep) {
    const already = candidates.some((c) => c.url.split("?")[0] === candidate.url.split("?")[0]);
    if (already) continue;
    stream.status(`抓取正文：${candidate.title.slice(0, 36)}…`, "fetch", { url: candidate.url });
    const page = await readPage(candidate.url, candidate.title);
    fetched++;
    if (page.ok) {
      deepPages.push({
        title: page.title,
        url: page.url,
        snippet: page.text.slice(0, 400),
        fullText: page.text,
        source: new URL(page.url).hostname,
        provider: page.method,
        sourceType: page.url.includes(".gov.cn") ? "gov" : "web",
        confidenceScore: page.method === "fetch" ? 0.75 : 0.8,
      });
      stream.source({ title: page.title, url: page.url, charCount: page.charCount, method: page.method });
    }
  }

  stream.status(`正文抓取完成：${fetched} 次请求，${deepPages.length} 篇可用`, "fetch");

  return { plan, bundle, deepPages };
}
