import type { EnrichedSource } from "@/lib/search/baike-fetcher";

export type WikiCandidateSource = "wikipedia_zh" | "wikipedia_en" | "wikidata";

export type WikiApiCandidate = {
  id: string;
  source: WikiCandidateSource;
  title: string;
  label: string;
  description?: string;
  url?: string;
  summary?: string;
  confidence: number;
  raw?: unknown;
};

type WikiSearchItem = {
  pageid?: number;
  title?: string;
  snippet?: string;
};

type WikiSummary = {
  title?: string;
  description?: string;
  extract?: string;
  content_urls?: { desktop?: { page?: string } };
  thumbnail?: { source?: string };
};

type WikidataSearchItem = {
  id?: string;
  label?: string;
  description?: string;
  concepturi?: string;
};

const WIKI_TIMEOUT_MS = Number(process.env.WIKIMEDIA_TIMEOUT_MS || 8000);
const USER_AGENT =
  process.env.WIKIMEDIA_USER_AGENT ||
  "BrandNet-IP-Card-AI/1.0 (contact: admin@ms1001.com)";

function stripHtml(value = ""): string {
  return value
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(WIKI_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function actionSearchUrl(host: "zh.wikipedia.org" | "en.wikipedia.org", search: string): string {
  return `https://${host}/w/api.php?${new URLSearchParams({
    action: "query",
    list: "search",
    srsearch: search,
    format: "json",
    srlimit: "10",
    origin: "*",
  }).toString()}`;
}

function summaryUrl(host: "zh.wikipedia.org" | "en.wikipedia.org", title: string): string {
  return `https://${host}/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}`;
}

async function getWikipediaSummary(
  host: "zh.wikipedia.org" | "en.wikipedia.org",
  title: string,
): Promise<WikiSummary | null> {
  return fetchJson<WikiSummary>(summaryUrl(host, title));
}

async function searchWikipedia(
  host: "zh.wikipedia.org" | "en.wikipedia.org",
  source: "wikipedia_zh" | "wikipedia_en",
  name: string,
): Promise<WikiApiCandidate[]> {
  const data = await fetchJson<{ query?: { search?: WikiSearchItem[] } }>(
    actionSearchUrl(host, name),
  );
  const items = data?.query?.search || [];
  const out: WikiApiCandidate[] = [];

  for (const item of items.slice(0, 6)) {
    if (!item.title) continue;
    const summary = await getWikipediaSummary(host, item.title);
    const url =
      summary?.content_urls?.desktop?.page ||
      `https://${host}/wiki/${encodeURIComponent(item.title.replace(/ /g, "_"))}`;
    const text = summary?.extract || stripHtml(item.snippet);
    out.push({
      id: `${source}:${item.pageid || encodeURIComponent(item.title)}`,
      source,
      title: summary?.title || item.title,
      label: summary?.title || item.title,
      description: summary?.description || stripHtml(item.snippet),
      summary: text,
      url,
      confidence: source === "wikipedia_zh" ? 0.9 : 0.82,
      raw: { search: item, summary },
    });
  }

  return out;
}

async function exactWikipediaCandidate(
  host: "zh.wikipedia.org" | "en.wikipedia.org",
  source: "wikipedia_zh" | "wikipedia_en",
  name: string,
): Promise<WikiApiCandidate[]> {
  const summary = await getWikipediaSummary(host, name);
  if (!summary?.extract || !summary.title) return [];
  return [
    {
      id: `${source}:${encodeURIComponent(summary.title)}`,
      source,
      title: summary.title,
      label: summary.title,
      description: summary.description,
      summary: summary.extract,
      url:
        summary.content_urls?.desktop?.page ||
        `https://${host}/wiki/${encodeURIComponent(summary.title.replace(/ /g, "_"))}`,
      confidence: source === "wikipedia_zh" ? 0.88 : 0.8,
      raw: { summary },
    },
  ];
}
export async function searchWikidataCandidates(name: string): Promise<WikiApiCandidate[]> {
  const url = `https://www.wikidata.org/w/api.php?${new URLSearchParams({
    action: "wbsearchentities",
    search: name,
    language: "zh",
    format: "json",
    limit: "10",
    origin: "*",
  }).toString()}`;
  const data = await fetchJson<{ search?: WikidataSearchItem[] }>(url);
  return (data?.search || [])
    .filter((item) => item.id && item.label)
    .slice(0, 10)
    .map((item) => ({
      id: `wikidata:${item.id}`,
      source: "wikidata" as const,
      title: item.label || name,
      label: item.label || name,
      description: item.description,
      summary: item.description,
      url: item.concepturi || `https://www.wikidata.org/wiki/${item.id}`,
      confidence: 0.78,
      raw: item,
    }));
}

export async function lookupOfficialWikiCandidates(name: string): Promise<WikiApiCandidate[]> {
  const [zhExact, enExact, zh, en, wikidata] = await Promise.allSettled([
    exactWikipediaCandidate("zh.wikipedia.org", "wikipedia_zh", name),
    exactWikipediaCandidate("en.wikipedia.org", "wikipedia_en", name),
    searchWikipedia("zh.wikipedia.org", "wikipedia_zh", name),
    searchWikipedia("en.wikipedia.org", "wikipedia_en", name),
    searchWikidataCandidates(name),
  ]);

  return [zhExact, enExact, zh, en, wikidata].flatMap((result) =>
    result.status === "fulfilled" ? result.value : [],
  );
}

function stripWikiHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<sup[^>]*>[\s\S]*?<\/sup>/gi, "")
    .replace(/<table[\s\S]*?<\/table>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchWikipediaFullText(
  host: "zh.wikipedia.org" | "en.wikipedia.org",
  title: string,
): Promise<string | null> {
  const url = `https://${host}/w/api.php?${new URLSearchParams({
    action: "parse",
    page: title,
    prop: "text",
    format: "json",
    formatversion: "2",
    redirects: "true",
    origin: "*",
  }).toString()}`;

  const data = await fetchJson<{ parse?: { text?: string } }>(url);
  const html = data?.parse?.text;
  if (!html) return null;

  const plain = stripWikiHtml(html);
  return plain.length >= 80 ? plain : null;
}

export async function fetchOfficialWikipediaEntry(
  titleOrUrl: string,
  fallbackTitle: string,
): Promise<EnrichedSource | null> {
  const url = titleOrUrl.startsWith("http") ? titleOrUrl : "";
  const host = url.includes("en.wikipedia.org") ? "en.wikipedia.org" : "zh.wikipedia.org";
  const rawTitle = url
    ? decodeURIComponent(url.split("/wiki/")[1] || fallbackTitle).replace(/_/g, " ")
    : titleOrUrl;
  const summary = await getWikipediaSummary(host, rawTitle);
  const fullFromParse = await fetchWikipediaFullText(host, summary?.title || rawTitle);
  const extract = fullFromParse || summary?.extract;
  if (!extract || extract.length < 40) return null;

  const pageUrl =
    summary?.content_urls?.desktop?.page ||
    url ||
    `https://${host}/wiki/${encodeURIComponent(rawTitle.replace(/ /g, "_"))}`;

  return {
    title: `${summary?.title || rawTitle} - Wikipedia`,
    url: pageUrl,
    snippet: extract.slice(0, 400),
    fullText: extract.slice(0, 24000),
    source: host,
    provider: fullFromParse
      ? host === "zh.wikipedia.org"
        ? "wikipedia-parse-zh"
        : "wikipedia-parse-en"
      : host === "zh.wikipedia.org"
        ? "wikipedia-rest-zh"
        : "wikipedia-rest-en",
    sourceType: "wiki",
    confidenceScore: host === "zh.wikipedia.org" ? 0.92 : 0.84,
  };
}
