import { fetchNewsForEntity } from "@/lib/news/fetcher";
import {
  extractBaikeUrlsFromResults,
  fetchAllBaikeEntries,
  fetchBaikeFromUrl,
  fetchZhWikiEntry,
  formatEnrichedSource,
  rankBaikeEntries,
  type EnrichedSource,
} from "@/lib/search/baike-fetcher";
import { expandPersonSearchNames, getDirectBaikeUrls, isKnownFamousName } from "@/lib/search/person-name-aliases";
import {
  isWrongPersonBaikeEntry,
  sanitizeEnrichedSource,
} from "@/lib/search/baike-entry-filter";
import { decodeHtmlEntities } from "@/lib/content/decode-html";
import { fetchPageExcerpt } from "@/lib/search/page-fetcher";
import { crawlWebSources, formatWebCrawlContext } from "@/lib/search/web-crawler";
import {
  formatSearchContext,
  searchWebMulti,
  type SearchResult,
} from "@/lib/search/web-search";
import type {
  ResearchBundle,
  ResearchProgressCallback,
  ResearchStep,
} from "@/lib/search/research-types";

function emit(onProgress: ResearchProgressCallback | undefined, step: ResearchStep) {
  onProgress?.(step);
}

function dedupeResults(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  return results.filter((item) => {
    const key = item.url || item.title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function authorityScore(url: string): number {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host === "baike.baidu.com") return 100;
    if (host.includes("wikipedia.org")) return 95;
    if (host.endsWith(".gov.cn")) return 90;
    if (host.includes("people.com.cn") || host.includes("xinhuanet.com")) return 80;
    return 10;
  } catch {
    return 0;
  }
}

function buildSearchQueries(
  name: string,
  type: string,
  extraQueries: string[] = [],
): string[] {
  const base = [name, `${name} ç®€ä»‹`, `${name} æ˜¯è°`, `${name} ä¸ªäººèµ„æ–™`];

  if (type === "person") {
    const aliasQueries = expandPersonSearchNames(name).flatMap((n) => [
      `${n} site:baike.baidu.com`,
      `${n} ç™¾åº¦ç™¾ç§‘`,
    ]);
    return [
      ...extraQueries,
      ...base,
      ...aliasQueries,
      `${name} site:zh.wikipedia.org`,
      `${name} ä¼ä¸šå®¶ åˆ›ä¸šç»åŽ† ç®€ä»‹`,
      `${name} å…¬å¸ èŒåŠ¡ åˆ›å§‹äºº`,
      `"${name}" äººç‰© ç®€åŽ†`,
    ];
  }

  if (type === "city") {
    return [
      `${name} åŸŽå¸‚ äº§ä¸š å®šä½`,
      `${name} äººæ°‘æ”¿åºœ site:gov.cn`,
      `${name} site:baike.baidu.com`,
      `${name} æ‹›å•†å¼•èµ„ è¥å•†çŽ¯å¢ƒ`,
      `${name} ä»£è¡¨ä¼ä¸š`,
    ];
  }

  if (type === "company") {
    return [
      `${name} å…¬å¸ ä¼ä¸š`,
      `${name} site:baike.baidu.com`,
      `${name} åˆ›å§‹äºº äº§å“`,
      `${name} å®˜ç½‘ å“ç‰Œ`,
      `${name} æ–°é—»`,
    ];
  }

  return [
    ...base,
    `${name} site:baike.baidu.com`,
    `${name} å“ç‰Œ`,
    `${name} æ–°é—»`,
  ];
}

const LOW_QUALITY_PAGE_HOSTS = [
  "tags.sina.com.cn",
  "k.sina.cn",
  "36kr.com",
  "tech.ifeng.com",
  "news.qq.com",
  "baijiahao.baidu.com",
  "toutiao.com",
  "sohu.com",
];

function isGovPageUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host.endsWith(".gov.cn");
  } catch {
    return false;
  }
}

function matchesExcludeKeywords(text: string, excludeKeywords: string[]): boolean {
  if (!excludeKeywords.length) return false;
  const lower = text.toLowerCase();
  return excludeKeywords.some((kw) => lower.includes(kw.toLowerCase()));
}

function isLowQualityPageUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return LOW_QUALITY_PAGE_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

function isPlaceholderNews(news: { title: string; excerpt?: string }): boolean {
  return (
    news.title.includes("å¾…æŠ“å–") ||
    news.title.includes("ç›¸å…³äººç‰©åŠ¨æ€") ||
    news.excerpt?.includes("å¾…æŠ“å–") === true
  );
}

function baikeCharCount(entries: EnrichedSource[]): number {
  return entries.reduce((n, e) => n + (e.fullText?.length || 0), 0);
}

function hasRichBaike(entries: EnrichedSource[], wiki: EnrichedSource | null): boolean {
  return baikeCharCount(entries) >= 800 || (wiki?.fullText?.length || 0) >= 1200;
}

function shouldPreferBaikeOnly(
  name: string,
  entries: EnrichedSource[],
  wiki: EnrichedSource | null,
): boolean {
  return hasRichBaike(entries, wiki) || (isKnownFamousName(name) && entries.length > 0);
}

function capContext(parts: string[], maxChars = 38000): string {
  let text = parts.filter(Boolean).join("\n\n");
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n\nï¼ˆèµ„æ–™å·²æˆªæ–­ï¼Œä¼˜å…ˆä¿ç•™ç™¾ç§‘ä¸Žæƒå¨æ¥æºï¼‰`;
}

export async function gatherDeepResearch(
  name: string,
  type: string,
  options: {
    fetchNews?: boolean;
    onProgress?: ResearchProgressCallback;
    extraQueries?: string[];
    excludeKeywords?: string[];
    /** äººç‰©æ£€ç´¢æ—¶ä¸æŠ“æ”¿åºœé—¨æˆ·é¦–é¡µ */
    skipGovPages?: boolean;
  } = {},
): Promise<ResearchBundle> {
  const steps: ResearchStep[] = [];
  const onProgress = (step: ResearchStep) => {
    steps.push(step);
    emit(options.onProgress, step);
  };

  const fetchNews = options.fetchNews !== false;
  const extraQueries = options.extraQueries || [];
  const excludeKeywords = options.excludeKeywords || [];
  const skipGovPages = options.skipGovPages ?? type === "person";

  onProgress({
    phase: "search",
    label: `å¼€å§‹æ£€ç´¢ã€Œ${name}ã€å…¬å¼€èµ„æ–™`,
    status: "running",
  });

  const queries = buildSearchQueries(name, type, extraQueries);
  onProgress({
    phase: "search",
    label: `è”ç½‘æ£€ç´¢ ${queries.length} ç»„å…³é”®è¯`,
    detail: queries.slice(0, 4).join(" Â· "),
    status: "running",
  });

  const [news, webResults, baikeEntries, wiki, webCrawl] = await Promise.all([
    fetchNews
      ? fetchNewsForEntity(name, type).then((items) => {
          onProgress({
            phase: "news",
            label: `æ–°é—» RSS ${items.length} æ¡`,
            status: items.length ? "done" : "skipped",
          });
          return items;
        })
      : Promise.resolve([]),
    searchWebMulti(queries, 8, 45).then((items) => {
      onProgress({
        phase: "search",
        label: `ç½‘é¡µæ£€ç´¢å®Œæˆï¼Œ${items.length} æ¡ç»“æžœ`,
        status: "done",
      });
      return items;
    }),
    fetchAllBaikeEntries(name).then((entries) => {
      if (entries.length) {
        for (const entry of entries) {
          onProgress({
            phase: "baike",
            label: `ç™¾åº¦ç™¾ç§‘ï¼š${entry.title.replace(/ - ç™¾åº¦ç™¾ç§‘$/, "")}`,
            url: entry.url,
            detail: `${entry.fullText?.length || 0} å­—`,
            status: "done",
          });
        }
      } else {
        onProgress({
          phase: "baike",
          label: "æœªæ‰¾åˆ°ç™¾åº¦ç™¾ç§‘è¯æ¡",
          status: "skipped",
        });
      }
      return entries;
    }),
    fetchZhWikiEntry(name).then((entry) => {
      if (entry) {
        onProgress({
          phase: "wiki",
          label: `ç»´åŸºç™¾ç§‘ï¼š${name}`,
          url: entry.url,
          detail: `${entry.fullText?.length || 0} å­—`,
          status: "done",
        });
      } else {
        onProgress({
          phase: "wiki",
          label: "æœªæ‰¾åˆ°ç»´åŸºç™¾ç§‘è¯æ¡",
          status: "skipped",
        });
      }
      return entry;
    }),
    crawlWebSources({
      name,
      entityType: type,
      excludeKeywords,
      maxPages: type === "person" ? 8 : 6,
      onProgress: options.onProgress,
    }).then((result) => {
      steps.push(...result.steps);
      return result;
    }),
  ]);

  onProgress({ phase: "merge", label: "åˆå¹¶æ£€ç´¢ç»“æžœ", status: "running" });

  const baikeUrls = new Set(baikeEntries.map((e) => e.url));
  for (const url of extractBaikeUrlsFromResults(webResults)) {
    if (baikeUrls.has(url)) continue;
    const entry = await fetchBaikeFromUrl(url, name);
    if (entry) {
      baikeEntries.push(entry);
      baikeUrls.add(entry.url);
      onProgress({
        phase: "baike",
        label: `ç™¾åº¦ç™¾ç§‘ï¼ˆæ£€ç´¢è¡¥æŠ“ï¼‰ï¼š${entry.title.replace(/ - ç™¾åº¦ç™¾ç§‘$/, "")}`,
        url: entry.url,
        detail: `${entry.fullText?.length || 0} å­—`,
        status: "done",
      });
      continue;
    }

    const snippetResult = webResults.find((r) => r.url.split("?")[0] === url.split("?")[0]);
    const directUrls = new Set(getDirectBaikeUrls(name));
    const isDirect = [...directUrls].some((u) => u.split("?")[0] === url.split("?")[0]);
    if (snippetResult?.snippet && snippetResult.snippet.length >= 80 && isDirect) {
      const fallbackEntry: EnrichedSource = sanitizeEnrichedSource({
        title: `${decodeHtmlEntities(snippetResult.title || name)} - ç™¾åº¦ç™¾ç§‘`,
        url: snippetResult.url,
        snippet: decodeHtmlEntities(snippetResult.snippet),
        fullText: decodeHtmlEntities(snippetResult.snippet),
        source: "baike.baidu.com",
        provider: "baike-snippet",
        sourceType: "baike",
        confidenceScore: 0.85,
      });
      if (isWrongPersonBaikeEntry(fallbackEntry, name)) continue;
      baikeEntries.push(fallbackEntry);
      baikeUrls.add(fallbackEntry.url);
      onProgress({
        phase: "baike",
        label: `ç™¾åº¦ç™¾ç§‘ï¼ˆæ‘˜è¦å…œåº•ï¼‰ï¼š${name}`,
        url: fallbackEntry.url,
        detail: `${fallbackEntry.fullText?.length || 0} å­—`,
        status: "done",
      });
    }
  }

  baikeEntries.splice(0, baikeEntries.length, ...rankBaikeEntries(baikeEntries, name));

  const webCrawlPages = webCrawl.crawledPages;
  const webCrawlBlock = webCrawl.contextBlock;

  const richBaike = shouldPreferBaikeOnly(name, baikeEntries, wiki);
  const filteredWeb = webResults
    .filter((r) => !r.url.includes("baike.baidu.com") || !baikeUrls.has(r.url))
    .filter((r) => !skipGovPages || !isGovPageUrl(r.url))
    .filter(
      (r) => !matchesExcludeKeywords(`${r.title} ${r.snippet}`, excludeKeywords),
    );

  const fetchCandidates = [...filteredWeb]
    .sort((a, b) => authorityScore(b.url) - authorityScore(a.url))
    .filter((r) => authorityScore(r.url) >= 10)
    .filter((r) => !isLowQualityPageUrl(r.url))
    .filter((r) => !skipGovPages || !isGovPageUrl(r.url))
    .slice(0, 4);

  const pageExcerpts: EnrichedSource[] = [...webCrawlPages];
  const pageFetchLimit = Math.max(0, 4 - pageExcerpts.length);
  for (const candidate of fetchCandidates.slice(0, pageFetchLimit)) {
    onProgress({
      phase: "page",
      label: `æŠ“å–æ­£æ–‡ï¼š${candidate.title.slice(0, 40)}`,
      url: candidate.url,
      status: "running",
    });
    const excerpt = await fetchPageExcerpt(candidate.url, candidate.title);
    if (excerpt) {
      if (skipGovPages && isGovPageUrl(excerpt.url)) continue;
      if (
        matchesExcludeKeywords(
          `${excerpt.title} ${excerpt.fullText || excerpt.snippet}`,
          excludeKeywords,
        )
      ) {
        continue;
      }
      pageExcerpts.push(excerpt);
      onProgress({
        phase: "page",
        label: `å·²æŠ“å–ï¼š${excerpt.title.slice(0, 40)}`,
        url: excerpt.url,
        detail: `${excerpt.fullText?.length || 0} å­—`,
        status: "done",
      });
    } else {
      onProgress({
        phase: "page",
        label: `è·³è¿‡ï¼ˆæ— æ³•è§£æžï¼‰ï¼š${candidate.title.slice(0, 30)}`,
        url: candidate.url,
        status: "skipped",
      });
    }
  }

  const baikeBlocks = baikeEntries.map((e, i) => formatEnrichedSource(e, i + 1));
  const wikiBlock = wiki ? formatEnrichedSource(wiki, baikeEntries.length + 1) : "";

  const realNews = news.filter((n) => !isPlaceholderNews(n));
  const newsBlock =
    realNews.length
      ? `【新闻报道 ${realNews.length} 条（补充参考）】\n${realNews
          .map(
            (n, i) =>
              `[新闻 ${i + 1}] ${n.title}\n来源：${n.source || "新闻"}\n链接：${n.url}${n.excerpt ? `\n摘要：${n.excerpt}` : ""}`,
          )
          .join("\n\n")}`
      : "";

  const webBlock =
    filteredWeb.length && !webCrawlBlock
      ? `【联网检索 ${filteredWeb.length} 条】\n${formatSearchContext(filteredWeb.slice(0, 12))}`
      : "";

  const pageBlock = webCrawlBlock || (pageExcerpts.length
    ? formatWebCrawlContext(pageExcerpts)
    : "");

  const contextText = capContext([
    pageBlock,
    baikeBlocks.join("\n\n"),
    wikiBlock,
    newsBlock,
    webBlock,
  ]);

  const mergedWeb: SearchResult[] = dedupeResults([
    ...baikeEntries.map((e) => ({
      title: e.title,
      url: e.url,
      snippet: e.snippet,
      source: e.source,
      provider: e.provider,
    })),
    ...(wiki
      ? [{ title: wiki.title, url: wiki.url, snippet: wiki.snippet, source: wiki.source, provider: wiki.provider }]
      : []),
    ...filteredWeb,
  ]);

  onProgress({
    phase: "merge",
    label: `èµ„æ–™åˆå¹¶å®Œæˆï¼Œå…± ${baikeEntries.length + (wiki ? 1 : 0) + news.length + mergedWeb.length} æ¡æ¥æº`,
    detail: `ä¸Šä¸‹æ–‡ ${contextText.length} å­—`,
    status: "done",
  });

  return {
    news,
    webResults: mergedWeb,
    baikeEntries,
    wiki,
    webCrawlPages,
    pageExcerpts,
    contextText,
    sourceCount: news.length + mergedWeb.length + pageExcerpts.length + webCrawlPages.length,
    steps,
  };
}

