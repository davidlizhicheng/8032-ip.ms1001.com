import type { SearchResult } from "@/lib/search/web-search";
import { searchWebMulti } from "@/lib/search/web-search";
import { fetchOfficialWikipediaEntry } from "@/lib/knowledge/wiki-api";
import { decodeHtmlEntities } from "@/lib/content/decode-html";
import {
  isWrongPersonBaikeEntry,
  sanitizeEnrichedSource,
} from "@/lib/search/baike-entry-filter";
import { expandPersonSearchNames, getDirectBaikeUrls } from "@/lib/search/person-name-aliases";

const USER_AGENT = "Mozilla/5.0 (compatible; BrandNet/1.0; +https://brandnet.local)";

export type EnrichedSource = SearchResult & {
  fullText?: string;
  sourceType: "baike" | "gov" | "wiki" | "web";
  confidenceScore: number;
};

function stripHtml(value: string): string {
  return decodeHtmlEntities(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function trimText(value: string, limit: number): string {
  if (value.length <= limit) return value;
  return `${value.slice(0, limit)}â€¦`;
}

async function fetchPageText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      Referer: "https://www.baidu.com/",
    },
    cache: "no-store",
    redirect: "follow",
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) return "";
  return res.text();
}

function parseBaikeHtml(html: string, url: string, title: string): EnrichedSource | null {
  const summaryMatch =
    html.match(/class="lemmaSummary[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
    html.match(/data-tag="summary"[^>]*>([\s\S]*?)<\/div>/i);

  const paraMatches = [
    ...html.matchAll(/data-tag="paragraph"[^>]*>([\s\S]*?)<\/div>/gi),
    ...html.matchAll(/class="para[^"]*"[^>]*>([\s\S]*?)<\/div>/gi),
  ]
    .map((m) => stripHtml(m[1]))
    .filter((t) => t.length > 15)
    .slice(0, 40);

  const summary = summaryMatch ? stripHtml(summaryMatch[1]) : "";
  const body = paraMatches.join("\n");
  const fullText = trimText([summary, body].filter(Boolean).join("\n\n"), 20000);

  if (!fullText || fullText.length < 40) return null;

  const pageTitle =
    html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/_ç™¾åº¦ç™¾ç§‘.*$/, "").trim() ||
    title;

  return sanitizeEnrichedSource({
    title: `${decodeHtmlEntities(pageTitle)} - ç™¾åº¦ç™¾ç§‘`,
    url,
    snippet: trimText(summary || fullText, 400),
    fullText,
    source: "baike.baidu.com",
    provider: "baike",
    sourceType: "baike",
    confidenceScore: 0.95,
  });
}
async function findBaikeUrlsViaBing(name: string): Promise<string[]> {
  const queries = [
    `${name} site:baike.baidu.com`,
    `"${name}" site:baike.baidu.com`,
    `${name} ç™¾åº¦ç™¾ç§‘`,
  ];
  const urls = new Set<string>();

  for (const query of queries) {
    try {
      const searchUrl = `https://cn.bing.com/search?q=${encodeURIComponent(query)}&setlang=zh-Hans`;
      const res = await fetch(searchUrl, {
        headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
        cache: "no-store",
      });
      if (!res.ok) continue;
      const html = await res.text();
      const matches = [...html.matchAll(/https:\/\/baike\.baidu\.com\/item\/[^"&\s]+/g)];
      for (const m of matches) {
        urls.add(m[0].replace(/&amp;/g, "&").split("?")[0]);
      }
    } catch {
      /* try next */
    }
  }

  return [...urls].slice(0, 12);
}

/** ç›´æŽ¥è®¿é—®ç™¾åº¦ç™¾ç§‘è¯æ¡é¡µ */
export async function fetchBaikeEntry(name: string): Promise<EnrichedSource | null> {
  const candidates = [
    `https://baike.baidu.com/item/${encodeURIComponent(name)}`,
    `https://baike.baidu.com/item/${encodeURIComponent(`${name}ï¼ˆäººç‰©ï¼‰`)}`,
    `https://baike.baidu.com/item/${encodeURIComponent(`${name}ï¼ˆä¼ä¸šå®¶ï¼‰`)}`,
    `https://baike.baidu.com/item/${encodeURIComponent(`${name}ï¼ˆå…¬å¸ï¼‰`)}`,
  ];

  let best: EnrichedSource | null = null;
  let bestScore = -1;

  for (const url of candidates) {
    try {
      const entry = await fetchBaikeFromUrl(url, name);
      if (!entry) continue;
      const score = baikeEntryScore(entry, name, expandPersonSearchNames(name));
      if (score > bestScore) {
        bestScore = score;
        best = entry;
      }
    } catch {
      /* try next */
    }
  }

  return best;
}

function extractLemmaId(url: string): string | null {
  return url.match(/\/(\d+)\/?(?:\?|$)/)?.[1] || null;
}

export async function fetchBaikeViaOpenApi(lemmaTitle: string, lemmaId?: string): Promise<EnrichedSource | null> {
  const params = lemmaId
    ? `lemmaId=${lemmaId}`
    : `lemmaTitle=${encodeURIComponent(lemmaTitle)}`;
  const apiUrl = `https://baike.baidu.com/api/openapi/BkItemCard?${params}`;

  try {
    const res = await fetch(apiUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36",
        Referer: "https://baike.baidu.com/",
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      data?: {
        lemmaTitle?: string;
        lemmaDesc?: string;
        url?: string;
        summary?: string;
        abstract?: string;
      };
    };
    const card = data?.data;
    const body = [card?.lemmaDesc, card?.summary, card?.abstract].filter(Boolean).join("\n\n");
    if (!body || body.length < 40) return null;

    const title = card?.lemmaTitle || lemmaTitle;
    const url =
      card?.url ||
      (lemmaId
        ? `https://baike.baidu.com/item/${encodeURIComponent(title)}/${lemmaId}`
        : `https://baike.baidu.com/item/${encodeURIComponent(title)}`);

    return sanitizeEnrichedSource({
      title: `${title} - ç™¾åº¦ç™¾ç§‘`,
      url,
      snippet: trimText(body, 400),
      fullText: trimText(body, 20000),
      source: "baike.baidu.com",
      provider: "baike-api",
      sourceType: "baike",
      confidenceScore: 0.93,
    });
  } catch {
    return null;
  }
}

const MAX_DISAMBIGUATION_ENTRIES = 20;

function isBaikeDisambiguationHtml(html: string): boolean {
  return (
    /æ¶ˆæ­§ä¹‰|polysemantList|disambiguation|polysemantList-wrapper|è¯·é€‰æ‹©ä½ è¦æŸ¥è¯¢çš„å†…å®¹/i.test(
      html,
    ) || /class="polysemantList"/i.test(html)
  );
}

function parseBaikeDisambiguationLinks(
  html: string,
  name: string,
): Array<{ url: string; label: string }> {
  const results: Array<{ url: string; label: string }> = [];
  const seen = new Set<string>();
  const encoded = encodeURIComponent(name);

  for (const m of html.matchAll(/href="(\/item\/[^"?#]+)"[^>]*>([\s\S]{0,120}?)<\/a>/gi)) {
    const path = m[1];
    if (!path.includes(name) && !path.includes(encoded)) continue;
    const label = stripHtml(m[2]);
    if (!label || label.length < 2 || label.length > 80) continue;
    if (/ç¼–è¾‘|è®¨è®º|æ”¶è—|æ’­æŠ¥|å±•å¼€|æ”¶èµ·|ä¹‰é¡¹/.test(label)) continue;
    const fullUrl = `https://baike.baidu.com${path.split("?")[0]}`;
    if (seen.has(fullUrl)) continue;
    seen.add(fullUrl);
    results.push({ url: fullUrl, label });
  }

  return results;
}

function disambiguationStubEntry(link: { url: string; label: string }): EnrichedSource {
  const title = link.label.includes("ç™¾ç§‘") ? link.label : `${link.label} - ç™¾åº¦ç™¾ç§‘`;
  return sanitizeEnrichedSource({
    title,
    url: link.url,
    snippet: link.label,
    source: "baike.baidu.com",
    provider: "baike-disambiguation",
    sourceType: "baike",
    confidenceScore: 0.85,
  });
}

/** è§£æžç™¾ç§‘æ¶ˆæ­§é¡µï¼Œè¿”å›žå…¨éƒ¨ä¹‰é¡¹ï¼ˆä¾›ç”¨æˆ·é€ä¸€é€‰æ‹©ï¼‰ */
export async function fetchBaikeDisambiguationEntries(name: string): Promise<EnrichedSource[]> {
  const mainUrl = `https://baike.baidu.com/item/${encodeURIComponent(name)}`;
  let html = "";
  try {
    html = await fetchPageText(mainUrl);
  } catch {
    return [];
  }

  let links = parseBaikeDisambiguationLinks(html, name);

  const bingUrls = await findBaikeUrlsViaBing(name);
  const withLemmaId = bingUrls.filter((u) => /\/item\/[^/]+\/\d+/.test(u));
  for (const url of withLemmaId) {
    if (links.some((l) => l.url.split("?")[0] === url.split("?")[0])) continue;
    const lemmaId = extractLemmaId(url);
    const apiEntry = lemmaId ? await fetchBaikeViaOpenApi(name, lemmaId) : null;
    const label =
      apiEntry?.title.replace(/ - ç™¾åº¦ç™¾ç§‘$/, "") ||
      decodeURIComponent(url.split("/item/")[1]?.split("?")[0] || name).replace(/_/g, " ");
    links.push({ url, label });
  }

  if (links.length < 2 && !isBaikeDisambiguationHtml(html)) {
    return [];
  }

  const entries: EnrichedSource[] = [];
  const seen = new Set<string>();

  for (const link of links.slice(0, MAX_DISAMBIGUATION_ENTRIES)) {
    const normalized = link.url.split("?")[0];
    if (seen.has(normalized)) continue;
    seen.add(normalized);

    const lemmaId = extractLemmaId(link.url);
    let entry =
      (lemmaId ? await fetchBaikeViaOpenApi(name, lemmaId) : null) ||
      (await fetchBaikeFromUrl(link.url, name));

    if (!entry) {
      entry = disambiguationStubEntry(link);
    }
    if (!isWrongPersonBaikeEntry(entry, name)) {
      entries.push(entry);
    }
  }

  return enrichDisambiguationEntriesFromSerp(name, entries);
}

async function enrichDisambiguationEntriesFromSerp(
  name: string,
  entries: EnrichedSource[],
): Promise<EnrichedSource[]> {
  const needsEnrich = entries.some(
    (e) =>
      !e.fullText ||
      e.fullText.length < 80 ||
      /\/\d+$/.test(e.title.replace(/ - ç™¾åº¦ç™¾ç§‘$/, "")),
  );
  if (!needsEnrich) return entries;

  const webResults = await searchWebMulti(
    [`${name} site:baike.baidu.com`, `"${name}" ç™¾åº¦ç™¾ç§‘`, `${name} äººç‰© ç™¾åº¦ç™¾ç§‘`],
    8,
    24,
  );

  const byUrl = new Map<string, SearchResult>();
  for (const r of webResults) {
    const match = r.url.match(/https:\/\/baike\.baidu\.com\/item\/[^?\s#]+/);
    if (match) byUrl.set(match[0].split("?")[0], r);
  }

  return entries.map((entry) => {
    const hit = byUrl.get(entry.url.split("?")[0]);
    if (!hit) return entry;
    const pageTitle = hit.title
      .replace(/[_\-â€”â€“].*ç™¾åº¦ç™¾ç§‘.*$/i, "")
      .replace(/_ç™¾åº¦ç™¾ç§‘$/, "")
      .trim();
    if (!pageTitle || pageTitle.length < 2) return entry;
    const title = pageTitle.includes("ç™¾ç§‘") ? pageTitle : `${pageTitle} - ç™¾åº¦ç™¾ç§‘`;
    return sanitizeEnrichedSource({
      ...entry,
      title,
      snippet: hit.snippet?.slice(0, 400) || entry.snippet,
      fullText: entry.fullText && entry.fullText.length >= 80 ? entry.fullText : hit.snippet,
      provider: entry.provider || "baike-serp",
    });
  });
}

export async function fetchBaikeFromUrl(url: string, name: string): Promise<EnrichedSource | null> {
  try {
    const html = await fetchPageText(url);
    if (html.includes("lemmaSummary") || html.includes("data-tag=\"paragraph\"")) {
      const entry = parseBaikeHtml(html, url, name);
      if (entry && !isWrongPersonBaikeEntry(entry, name)) return entry;
    }

    const mobileUrl = url.replace("baike.baidu.com/item/", "m.baike.baidu.com/item/");
    if (mobileUrl !== url) {
      const mobileHtml = await fetchPageText(mobileUrl);
      if (mobileHtml.includes("lemmaSummary") || mobileHtml.includes("data-tag=\"paragraph\"")) {
        const entry = parseBaikeHtml(mobileHtml, url, name);
        if (entry && !isWrongPersonBaikeEntry(entry, name)) return entry;
      }
    }

    const lemmaId = extractLemmaId(url);
    const searchNames = expandPersonSearchNames(name);
    for (const candidate of searchNames) {
      const apiEntry = await fetchBaikeViaOpenApi(candidate, lemmaId || undefined);
      if (apiEntry && !isWrongPersonBaikeEntry(apiEntry, name)) return apiEntry;
    }
  } catch {
    /* fall through */
  }
  return null;
}

export function extractBaikeUrlsFromResults(results: SearchResult[]): string[] {
  const urls = new Set<string>();
  for (const item of results) {
    const match = item.url.match(/https:\/\/baike\.baidu\.com\/item\/[^?\s#]+/);
    if (match) urls.add(match[0].replace(/&amp;/g, "&"));
  }
  return [...urls];
}

export function rankBaikeEntries(entries: EnrichedSource[], name: string): EnrichedSource[] {
  const searchNames = expandPersonSearchNames(name);
  const scored = entries
    .filter((entry) => !isWrongPersonBaikeEntry(entry, name))
    .map((entry) => ({
      entry: sanitizeEnrichedSource(entry),
      score: baikeEntryScore(entry, name, searchNames),
    }))
    .sort((a, b) => b.score - a.score);

  const qualified = scored.filter(({ score }) => score >= 30);
  const picked = (qualified.length ? qualified : scored.slice(0, 1)).slice(0, 2);
  return picked.map(({ entry }) => entry);
}

function decodeTitle(title: string): string {
  return decodeHtmlEntities(title);
}

function baikeEntryScore(entry: EnrichedSource, name: string, searchNames: string[]): number {
  const title = decodeTitle(entry.title.replace(/ - ç™¾åº¦ç™¾ç§‘$/, ""));
  const textLen = entry.fullText?.length || 0;
  let score = Math.min(textLen / 50, 80);

  for (const n of searchNames) {
    if (title === n || title.startsWith(`${n}ï¼ˆ`)) score += 120;
    else if (title.includes(n)) score += 40;
  }

  const titleMatchesName = searchNames.some(
    (n) => title === n || title.startsWith(`${n}ï¼ˆ`) || title.includes(n),
  );
  if (!titleMatchesName) score -= 100;

  if (/ï¼ˆ\d{4}å¹´.*å‡ºç‰ˆ|å‡ºç‰ˆçš„å›¾ä¹¦|ä¼ è®°ä½œå®¶|äººç‰©ä¼ è®°|å°è¯´|ç”µå½±|æ­Œæ›²|ä¸“è¾‘|æ¸¸æˆ|å…¬å¸$|é›†å›¢$|æœ‰é™å…¬å¸$/.test(title)) {
    score -= 80;
  }
  if (/ï¼ˆäººç‰©ï¼‰|ï¼ˆä¼ä¸šå®¶ï¼‰|ï¼ˆ.*?å®¶ï¼‰|ï¼ˆ.*?å‘˜ï¼‰/.test(title)) {
    score += 30;
  }

  return score;
}

export async function fetchAllBaikeEntries(name: string): Promise<EnrichedSource[]> {
  const searchNames = expandPersonSearchNames(name);

  const disambiguation = await fetchBaikeDisambiguationEntries(name);
  if (disambiguation.length >= 2) {
    return disambiguation
      .map((e) => sanitizeEnrichedSource(e))
      .sort(
        (a, b) => baikeEntryScore(b, name, searchNames) - baikeEntryScore(a, name, searchNames),
      );
  }

  const entries: EnrichedSource[] = [];
  const seen = new Set<string>();

  const push = (entry: EnrichedSource | null) => {
    if (!entry || seen.has(entry.url.split("?")[0])) return;
    seen.add(entry.url.split("?")[0]);
    entries.push(entry);
  };

  for (const candidate of searchNames) {
    push(await fetchBaikeEntry(candidate));
  }

  for (const url of getDirectBaikeUrls(name)) {
    if (seen.has(url)) continue;
    push(await fetchBaikeFromUrl(url, name));
  }

  for (const candidate of searchNames) {
    if (!entries.length) {
      push(await fetchBaikeViaOpenApi(candidate));
    }
  }

  for (const candidate of searchNames) {
    const urls = await findBaikeUrlsViaBing(candidate);
    for (const url of urls) {
      if (seen.has(url)) continue;
      push(await fetchBaikeFromUrl(url, name));
    }
  }

  if (!entries.length) {
    push(await fetchBaikeViaSearch(name));
  }

  return entries
    .filter((e) => !isWrongPersonBaikeEntry(e, name))
    .map((e) => sanitizeEnrichedSource(e))
    .sort(
      (a, b) => baikeEntryScore(b, name, searchNames) - baikeEntryScore(a, name, searchNames),
    );
}

/** ä»Ž Bing æ‰¾åˆ°ç™¾ç§‘é“¾æŽ¥å¹¶æŠ“å–æ­£æ–‡ */
export async function fetchBaikeViaSearch(name: string): Promise<EnrichedSource | null> {
  const urls = await findBaikeUrlsViaBing(name);
  for (const baikeUrl of urls) {
    try {
      const pageHtml = await fetchPageText(baikeUrl);
      const entry = parseBaikeHtml(pageHtml, baikeUrl, name);
      if (entry) return entry;
    } catch {
      /* try next */
    }
  }
  return null;
}

export async function fetchZhWikiEntry(name: string): Promise<EnrichedSource | null> {
  return fetchOfficialWikipediaEntry(name, name);
}

export async function fetchWikiFromUrl(url: string, fallbackTitle: string): Promise<EnrichedSource | null> {
  return fetchOfficialWikipediaEntry(url, fallbackTitle);
}

export async function getBaikeResearch(name: string): Promise<EnrichedSource | null> {
  const all = await fetchAllBaikeEntries(name);
  return all[0] || null;
}

export function formatEnrichedSource(source: EnrichedSource, index: number): string {
  const clean = sanitizeEnrichedSource(source);
  const body = clean.fullText || clean.snippet;
  const sourceLabel =
    source.sourceType === "baike"
      ? "ç™¾åº¦ç™¾ç§‘"
      : source.sourceType === "wiki"
        ? "ç»´åŸºç™¾ç§‘"
        : source.sourceType === "gov"
          ? "æ”¿åºœå®˜ç½‘"
          : source.source || "ç½‘é¡µ";
  return `[æƒå¨èµ„æ–™ ${index}] ${clean.title}
æ¥æºï¼š${sourceLabel}ï¼ˆ${clean.url}ï¼‰
å¯ä¿¡åº¦ï¼š${(source.confidenceScore * 100).toFixed(0)}%
æ­£æ–‡ï¼š
${body}`;
}

export function formatWikiSource(source: EnrichedSource, index: number): string {
  return formatEnrichedSource(source, index).replace("ç™¾åº¦ç™¾ç§‘", "ç»´åŸºç™¾ç§‘");
}


