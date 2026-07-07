import {
  buildSelfProvidedCandidate,
  lookupPersonCandidatesFromEncyclopedia,
  resolveEncyclopediaCandidate,
} from "@/lib/search/lookup-person-encyclopedia";
import { resolveRegistryCandidate } from "@/lib/search/person-disambiguation-registry";
import { gatherPersonResearchForCard } from "@/lib/search/gather-person-research";
import { fetchBaikeFromUrl, fetchAllBaikeEntries, fetchBaikeViaOpenApi, fetchWikiFromUrl } from "@/lib/search/baike-fetcher";
import { searchWebMulti } from "@/lib/search/web-search";
import { crawlWebSources } from "@/lib/search/web-crawler";
import type { EnrichedSource } from "@/lib/search/baike-fetcher";
import {
  filterRelevantFacts,
  formatFactBundleForIntegration,
} from "@/lib/pipeline/fact-relevance-filter";
import type {
  PersonFactBundle,
  PersonPipelineOptions,
  PersonPipelineResult,
  PipelineStepLog,
  ReceivedUserInput,
  ResolvedPersonName,
} from "@/lib/pipeline/types";

export { formatFactBundleForIntegration } from "@/lib/pipeline/fact-relevance-filter";

/** ç¬¬ä¸€æ­¥ï¼šæ”¶å–ç”¨æˆ·è¾“å…¥ */
export function receiveUserInput(rawText: string, enrichFromWeb = false): ReceivedUserInput {
  const trimmed = rawText.trim();
  if (!trimmed) {
    throw new Error("è¯·è¾“å…¥ä¸ªäººèµ„æ–™å†…å®¹");
  }
  const minLen = enrichFromWeb ? 2 : 10;
  if (trimmed.length < minLen) {
    throw new Error(enrichFromWeb ? "å¼€å¯è”ç½‘ç”Ÿæˆæ—¶è‡³å°‘è¾“å…¥ 2 ä¸ªå­—ï¼ˆé€šå¸¸æ˜¯å§“åï¼‰" : "èµ„æ–™å†…å®¹è¿‡çŸ­ï¼Œè¯·è‡³å°‘è¾“å…¥ 10 ä¸ªå­—");
  }
  return { rawText: trimmed, charCount: trimmed.length, enrichFromWeb };
}

/** ç¬¬äºŒæ­¥ï¼šç¡®å®šäººåï¼ˆè§„åˆ™æå–ï¼Œä¸è°ƒç”¨æ’°å†™åž‹ AIï¼‰ */
export function resolvePersonName(rawText: string): ResolvedPersonName {
  const patterns = [
    { re: /æˆ‘å«([\u4e00-\u9fffÂ·]{2,8})/, conf: "high" as const },
    { re: /å§“å[ï¼š:]\s*([\u4e00-\u9fffÂ·]{2,8})/, conf: "high" as const },
    { re: /^([\u4e00-\u9fffÂ·]{2,4})/m, conf: "medium" as const },
  ];
  for (const { re, conf } of patterns) {
    const m = rawText.match(re);
    if (m?.[1]) {
      return { name: m[1].trim(), method: "regex", confidence: conf };
    }
  }
  const fallback = rawText.match(/[\u4e00-\u9fffÂ·]{2,4}/)?.[0] || "æœªå‘½å";
  return { name: fallback, method: "regex", confidence: "low" };
}

function logStep(
  steps: PipelineStepLog[],
  onStep: PersonPipelineOptions["onStep"],
  step: PipelineStepLog,
) {
  steps.push(step);
  onStep?.(step);
}

/** ç¬¬ä¸‰æ­¥ï¼šåªæŸ¥æ‰¾ã€åªç­›é€‰ç›¸å…³äº‹å®žï¼Œç¦æ­¢ AI æ•´åˆå†™ä½œ */
export async function fetchPersonFacts(options: {
  name: string;
  identityHint: string;
  registryCandidate?: import("@/lib/search/person-disambiguation-registry").RegistryPersonCandidate | null;
  confirmedBaikeUrl?: string;
  confirmedWikiUrl?: string;
  onStep?: (step: PipelineStepLog) => void;
}): Promise<PersonFactBundle> {
  const steps: PipelineStepLog[] = [];
  logStep(steps, options.onStep, {
    phase: "fetch",
    label: `æŸ¥æ‰¾ã€Œ${options.name}ã€ç›¸å…³ç™¾ç§‘ä¸Žæƒå¨èµ„æ–™â€¦`,
    status: "running",
  });

  let baikeEntries: EnrichedSource[] = [];
  let wiki = null as EnrichedSource | null;
  let webResults: import("@/lib/search/web-search").SearchResult[] = [];
  let webCrawlPages: EnrichedSource[] = [];
  let identityHint = options.identityHint;

  if (options.confirmedBaikeUrl) {
    const pinned = await fetchBaikeFromUrl(options.confirmedBaikeUrl, options.name);
    if (pinned) baikeEntries = [pinned];
    if (!baikeEntries.length) {
      const lemmaId = options.confirmedBaikeUrl.match(/\/(\d+)\/?(?:\?|$)/)?.[1];
      if (lemmaId) {
        const api = await fetchBaikeViaOpenApi(options.name, lemmaId);
        if (api) baikeEntries = [api];
      }
    }
    if (!baikeEntries.length) {
      const serp = await searchWebMulti(
        [`${options.name} site:baike.baidu.com`],
        4,
        6,
      );
      const hit = serp.find(
        (r) =>
          r.url.split("?")[0] === options.confirmedBaikeUrl?.split("?")[0] &&
          r.snippet.includes(options.name),
      );
      if (hit) {
        baikeEntries = [
          {
            title: `${options.name} - ç™¾åº¦ç™¾ç§‘`,
            url: options.confirmedBaikeUrl,
            snippet: hit.snippet.slice(0, 400),
            fullText: hit.snippet,
            source: "baike.baidu.com",
            provider: "baike-serp",
            sourceType: "baike",
            confidenceScore: 0.75,
          },
        ];
      }
    }
  }

  if (options.confirmedWikiUrl) {
    const pinnedWiki = await fetchWikiFromUrl(options.confirmedWikiUrl, options.name);
    if (pinnedWiki) wiki = pinnedWiki;
  }

  if (options.registryCandidate?.searchQueries?.length) {
    identityHint = options.registryCandidate.identityHint || identityHint;
    if (!baikeEntries.length) {
      for (const q of options.registryCandidate.searchQueries.slice(0, 3)) {
        const found = await fetchAllBaikeEntries(q.replace(/\s+site:.*/i, "").trim());
        if (found.length) {
          baikeEntries = found.slice(0, 2);
          break;
        }
      }
    }
    webResults = await searchWebMulti(options.registryCandidate.searchQueries, 5, 18);
  } else if (!options.confirmedBaikeUrl && !options.confirmedWikiUrl) {
    const research = await gatherPersonResearchForCard(options.name, {
      candidate: options.registryCandidate,
      identityHint,
      confirmedBaikeUrl: options.confirmedBaikeUrl,
      confirmedWikiUrl: options.confirmedWikiUrl,
    });
    baikeEntries = research.baikeEntries.length ? research.baikeEntries : baikeEntries;
    wiki = research.wiki || wiki;
    webResults = research.webResults;
    webCrawlPages = research.webCrawlPages || [];
    identityHint = options.identityHint || research.identityHint;
  }

  if (!webCrawlPages.length) {
    logStep(steps, options.onStep, {
      phase: "fetch",
      label: `第三通道：联网直爬「${options.name}」`,
      status: "running",
    });
    const crawl = await crawlWebSources({
      name: options.name,
      entityType: "person",
      identityHint,
      extraQueries: options.registryCandidate?.searchQueries,
      excludeKeywords: options.registryCandidate?.excludeKeywords,
      maxPages: 10,
    });
    webCrawlPages = crawl.crawledPages;
    logStep(steps, options.onStep, {
      phase: "fetch",
      label: `第三通道完成：${webCrawlPages.length} 篇网页正文`,
      status: webCrawlPages.length ? "done" : "skipped",
    });
  }

  const hasBaikeBody =
    baikeEntries.some((e) => (e.fullText?.length || e.snippet?.length || 0) >= 150) ||
    Boolean(wiki?.fullText && wiki.fullText.length >= 150);

  let facts = filterRelevantFacts({
    name: options.name,
    identityHint,
    baikeEntries,
    wiki,
    webCrawlPages,
    webResults: hasBaikeBody ? webResults.slice(0, 6) : webResults,
    excludeKeywords: options.registryCandidate?.excludeKeywords,
    minScore: hasBaikeBody ? 1 : 3,
  });

  const hintParts = identityHint
    .split(/[Â·ï¼Œ,ã€]/)
    .map((p) => p.trim())
    .filter((p) => p.length >= 3);
  const onTopic = facts.filter(
    (f) =>
      f.excerpt.includes(options.name) ||
      hintParts.some((h) => f.excerpt.includes(h)),
  );
  if (facts.length > 0 && onTopic.length === 0 && options.registryCandidate?.snippet) {
    facts = [
      {
        sourceType: "web",
        title: options.registryCandidate.label,
        url: options.registryCandidate.url || "",
        category: "bio",
        excerpt: options.registryCandidate.snippet,
        relevanceScore: 10,
      },
    ];
  } else if (facts.length === 0 && options.registryCandidate?.snippet) {
    facts = [
      {
        sourceType: "web",
        title: options.registryCandidate.label,
        url: options.registryCandidate.url || "",
        category: "bio",
        excerpt: options.registryCandidate.snippet,
        relevanceScore: 8,
      },
    ];
  }

  if (!hasBaikeBody && options.registryCandidate?.snippet) {
    const regSnippet = options.registryCandidate.snippet;
    const hasRegistryCore = facts.some((f) => f.excerpt.includes(regSnippet.slice(0, 20)));
    if (!hasRegistryCore) {
      facts = [
        {
          sourceType: "web",
          title: options.registryCandidate.label,
          url: options.registryCandidate.url || "",
          category: "bio",
          excerpt: regSnippet,
          relevanceScore: 10,
        },
        ...onTopic.slice(0, 4),
      ];
    }
  }

  logStep(steps, options.onStep, {
    phase: "fetch",
    label: `查找完成：百科 ${baikeEntries.length} 条，网页直爬 ${webCrawlPages.length} 篇，高相关事实 ${facts.length} 条`,
    detail: facts.slice(0, 3).map((f) => f.category).join("ã€"),
    status: "done",
  });

  return {
    name: options.name,
    identityHint,
    facts,
    baikeEntries,
    wiki,
    webCrawlPages,
    sourceCount: facts.length + baikeEntries.length + webCrawlPages.length + (wiki ? 1 : 0),
    steps,
  };
}

/**
 * äººç‰©å†…å®¹æµæ°´çº¿ï¼ˆæ­¥éª¤ 1â†’2â†’3ï¼Œæ­¥éª¤ 4 ç”±è°ƒç”¨æ–¹ executeIntegrate å®Œæˆï¼‰
 * æ­¥éª¤ 2 è‹¥æœªç¡®è®¤èº«ä»½åˆ™è¿”å›ž needs_confirmation
 */
export async function runPersonLookupPipeline(
  options: PersonPipelineOptions,
): Promise<PersonPipelineResult> {
  const steps: PipelineStepLog[] = [];
  const onStep = options.onStep;

  logStep(steps, onStep, {
    phase: "receive",
    label: "å·²æŽ¥æ”¶ç”¨æˆ·èµ„æ–™",
    detail: `${options.rawText.length} å­—`,
    status: "done",
  });

  const input = receiveUserInput(options.rawText, options.enrichFromWeb);
  const resolved = resolvePersonName(input.rawText);

  logStep(steps, onStep, {
    phase: "name",
    label: `ç¡®å®šäººåï¼š${resolved.name}`,
    detail: `æ–¹å¼ ${resolved.method}ï¼Œç½®ä¿¡ ${resolved.confidence}`,
    status: "done",
  });

  if (options.enrichFromWeb && !options.confirmedCandidateId && !options.confirmedIdentityHint) {
    const lookup = await lookupPersonCandidatesFromEncyclopedia(resolved.name);
    logStep(steps, onStep, {
      phase: "name",
      label: "ç­‰å¾…ç”¨æˆ·ç¡®è®¤ç™¾ç§‘æ¡ç›®",
      detail: lookup.reason,
      status: "done",
    });
    return {
      status: "needs_confirmation",
      name: resolved.name,
      reason: lookup.reason,
      candidates:
        lookup.candidates.length > 0
          ? lookup.candidates
          : [buildSelfProvidedCandidate(resolved.name, input.rawText)],
      allowCompare: lookup.allowCompare,
      steps,
    };
  }

  let identityHint = options.confirmedIdentityHint || "";
  let registryCandidate = null;
  let confirmedBaikeUrl: string | undefined;
  let confirmedWikiUrl: string | undefined;

  if (options.confirmedCandidateId) {
    const resolvedCandidate = await resolveEncyclopediaCandidate(
      resolved.name,
      options.confirmedCandidateId,
    );
    identityHint = resolvedCandidate.identityHint || identityHint;
    registryCandidate =
      resolvedCandidate.registryCandidate ||
      resolveRegistryCandidate(resolved.name, options.confirmedCandidateId);
    confirmedBaikeUrl = resolvedCandidate.baikeUrl;
    confirmedWikiUrl = resolvedCandidate.wikiUrl;
  }

  const factBundle = await fetchPersonFacts({
    name: resolved.name,
    identityHint,
    registryCandidate,
    confirmedBaikeUrl,
    confirmedWikiUrl,
    onStep,
  });

  return {
    status: "ready",
    name: resolved.name,
    identityHint: factBundle.identityHint,
    factBundle,
    steps: [...steps, ...factBundle.steps],
  };
}

