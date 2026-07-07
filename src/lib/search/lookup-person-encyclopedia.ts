import { decodeHtmlEntities } from "@/lib/content/decode-html";
import {
  fetchAllBaikeEntries,
  fetchBaikeFromUrl,
  fetchBaikeViaOpenApi,
  fetchZhWikiEntry,
  extractBaikeUrlsFromResults,
  type EnrichedSource,
} from "@/lib/search/baike-fetcher";
import {
  fetchOfficialWikipediaEntry,
  lookupOfficialWikiCandidates,
  type WikiApiCandidate,
} from "@/lib/knowledge/wiki-api";
import {
  readPersonKnowledgeCache,
  writePersonKnowledgeCache,
} from "@/lib/knowledge/person-knowledge-cache";
import { searchWebMulti } from "@/lib/search/web-search";
import type { PersonCandidate } from "@/lib/search/disambiguate-person";
import {
  getRegistryDisambiguation,
  resolveRegistryCandidate,
  type RegistryPersonCandidate,
} from "@/lib/search/person-disambiguation-registry";
import {
  parsePersonQuery,
  rankCandidatesByCompanyHint,
  filterCandidatesByExactPersonName,
} from "@/lib/search/parse-person-query";
import { getDirectBaikeUrls } from "@/lib/search/person-name-aliases";

export type PersonLookupOptions = {
  companyHint?: string;
};

export type EncyclopediaLookupResult = {
  name: string;
  candidates: PersonCandidate[];
  reason: string;
  allowCompare: boolean;
  sourcesSearched: string[];
  needsConfirmation: true;
};

function extractCoreFields(text: string) {
  const region =
    text.match(/(?:籍贯|出生地|生于|出生于)[：:\s]*([\u4e00-\u9fff]{2,12})/)?.[1] ||
    text.match(/([\u4e00-\u9fff]{2,6}(?:省|市|自治区|特别行政区))/)?.[1] ||
    text.match(/(深圳|广州|北京|上海|杭州|成都|武汉|合肥|南京|西安|重庆|天津|苏州|东莞)/)?.[1];
  const occupation =
    text.match(
      /([^，。；\n]{2,24}(?:家|员|士|长|官|教授|博士|工程师|顾问|创始人|董事长|CEO|总裁|秘书长|市长|局长|院士|律师|医生|演员|歌手|作家|记者|教练|运动员))/,
    )?.[1];
  const org =
    text.match(
      /([\u4e00-\u9fffA-Za-z0-9（）()·]{2,28}(?:公司|集团|大学|学院|政府|学会|协会|研究院|基金会|委员会|人民政府|特区政府))/,
    )?.[1];
  return { region, occupation, org };
}

function candidateIdForEntry(entry: EnrichedSource): string {
  return `${entry.sourceType}:${encodeURIComponent(entry.url.split("?")[0])}`;
}

function sourceLabel(source: string | undefined): string {
  if (source === "baike") return "百度百科";
  if (source === "wiki" || source?.startsWith("wikipedia")) return "Wikipedia";
  if (source === "wikidata") return "Wikidata";
  if (source === "registry") return "人工登记库";
  return source || "公开资料";
}

function entryToCandidate(entry: EnrichedSource, name: string): PersonCandidate {
  const pageTitle = decodeHtmlEntities(
    entry.title.replace(/ - (百度百科|维基百科|Wikipedia)$/, "").trim(),
  );
  const text = entry.fullText || entry.snippet;
  const { region, occupation, org } = extractCoreFields(text);
  const baseName = name.trim();

  let label = pageTitle;
  if (pageTitle === baseName || pageTitle.startsWith(`${baseName}（`)) {
    const parts = [pageTitle.startsWith(`${baseName}（`) ? pageTitle : baseName];
    if (region) parts.push(region);
    if (occupation && !pageTitle.includes(occupation)) parts.push(occupation);
    label = parts.join(" · ");
  }

  const source = entry.sourceType === "wiki" ? "wiki" : entry.sourceType;
  const summary = entry.snippet.slice(0, 280);

  return {
    id: candidateIdForEntry(entry),
    label,
    title: occupation,
    company: org,
    region,
    snippet: `[${sourceLabel(source)}] ${summary}`,
    summary,
    url: entry.url,
    source,
    confidence: entry.confidenceScore,
  };
}

function wikiApiCandidateToCandidate(candidate: WikiApiCandidate): PersonCandidate {
  const text = candidate.summary || candidate.description || "";
  const { region, occupation, org } = extractCoreFields(text);
  const isWikipedia = candidate.source.startsWith("wikipedia");
  return {
    id: isWikipedia && candidate.url
      ? `wiki:${encodeURIComponent(candidate.url.split("?")[0])}`
      : `${candidate.source}:${candidate.id.replace(/^.*?:/, "")}`,
    label: [candidate.label, candidate.description].filter(Boolean).join(" · ").slice(0, 90),
    title: occupation,
    company: org,
    region,
    snippet: `[${sourceLabel(candidate.source)}] ${text.slice(0, 220) || candidate.label}`,
    summary: text || candidate.description,
    url: candidate.url,
    source: candidate.source,
    confidence: candidate.confidence,
  };
}

function dedupeCandidates(candidates: PersonCandidate[]): PersonCandidate[] {
  const seen = new Set<string>();
  return candidates.filter((c) => {
    const key = c.url?.split("?")[0] || `${c.source || ""}|${c.label}|${c.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function supplementBaikeFromWebSearch(
  name: string,
  companyHint?: string,
): Promise<EnrichedSource[]> {
  const queries = [
    `${name} site:baike.baidu.com`,
    `"${name}" 百度百科`,
    `${name} 人物 百度百科`,
  ];
  if (companyHint) {
    queries.unshift(`${name} ${companyHint} site:baike.baidu.com`);
    queries.push(`${name} ${companyHint} 百度百科`);
  }
  const webResults = await searchWebMulti(queries, 6, 18);
  const urls = extractBaikeUrlsFromResults(webResults);
  const out: EnrichedSource[] = [];
  const seen = new Set<string>();

  for (const url of urls.slice(0, 6)) {
    const normalized = url.split("?")[0];
    if (seen.has(normalized)) continue;
    seen.add(normalized);

    let entry = await fetchBaikeFromUrl(normalized, name);
    if (!entry) {
      const lemmaId = normalized.match(/\/(\d+)\/?$/)?.[1];
      if (lemmaId) entry = await fetchBaikeViaOpenApi(name, lemmaId);
    }
    if (entry && (entry.fullText?.length || 0) >= 40) {
      out.push(entry);
      continue;
    }

    const hit = webResults.find((r) => r.url.split("?")[0] === normalized);
    if (hit && hit.snippet.length >= 50 && hit.snippet.includes(name)) {
      out.push({
        title: `${name} - 百度百科`,
        url: normalized,
        snippet: hit.snippet.slice(0, 400),
        fullText: hit.snippet,
        source: "baike.baidu.com",
        provider: "baike-serp",
        sourceType: "baike",
        confidenceScore: 0.72,
      });
    }
  }
  return out;
}

function mergeRegistryCandidates(name: string, candidates: PersonCandidate[]): PersonCandidate[] {
  const registry = getRegistryDisambiguation(name);
  if (!registry) return candidates;

  const seenIds = new Set(candidates.map((c) => c.id));
  const merged = [...candidates];
  for (const rc of registry.candidates) {
    if (seenIds.has(rc.id)) continue;
    seenIds.add(rc.id);
    merged.push({
      id: rc.id,
      label: rc.label,
      title: rc.title,
      company: rc.company,
      snippet: rc.snippet,
      summary: rc.snippet,
      url: rc.url,
      region: rc.region,
      source: "registry",
      confidence: 0.88,
    });
  }
  return merged;
}

function buildReason(name: string, count: number, sourcesSearched: string[]): string {
  const sources = sourcesSearched.length ? sourcesSearched.join("、") : "本地缓存/公开知识源";
  if (count > 1) {
    return `已在${sources}检索到 ${count} 个「${name}」相关候选。请先确认是哪一位，再开始生成内容。`;
  }
  if (count === 1) {
    return `已在${sources}检索到 1 个「${name}」相关候选。即使只有一个候选，也需要确认身份后再继续。`;
  }
  return `暂未检索到「${name}」的明确百科候选。请确认是否按您提供的资料生成，确认前不会生成正文。`;
}

export async function lookupPersonCandidatesFromEncyclopedia(
  name: string,
  options: PersonLookupOptions = {},
): Promise<EncyclopediaLookupResult> {
  const parsed = parsePersonQuery(name, options.companyHint);
  const personName = parsed.personName;
  const companyHint = parsed.companyHint;
  const sourcesSearched: string[] = [];

  const cached = await readPersonKnowledgeCache(personName);
  if (cached.length) sourcesSearched.push("本地缓存");

  const entries: EnrichedSource[] = [];
  const seenUrls = new Set<string>();
  const pushEntry = (entry: EnrichedSource | null) => {
    if (!entry) return;
    const url = entry.url.split("?")[0];
    if (seenUrls.has(url)) return;
    seenUrls.add(url);
    entries.push(entry);
  };

  for (const url of getDirectBaikeUrls(personName)) {
    pushEntry(await fetchBaikeFromUrl(url, personName));
  }

  const [baikeResult, wikiResult] = await Promise.allSettled([
    fetchAllBaikeEntries(personName),
    lookupOfficialWikiCandidates(personName),
  ]);

  const baikeEntries = baikeResult.status === "fulfilled" ? baikeResult.value : [];
  if (baikeEntries.length || baikeResult.status === "fulfilled") sourcesSearched.push("百度百科");
  for (const entry of baikeEntries) pushEntry(entry);

  if (baikeEntries.length === 0 || baikeEntries.every((e) => (e.fullText?.length || 0) < 200)) {
    for (const entry of await supplementBaikeFromWebSearch(personName, companyHint)) pushEntry(entry);
    if (entries.length > baikeEntries.length) sourcesSearched.push("百度百科链接检索");
  }

  const wikiCandidates = wikiResult.status === "fulfilled" ? wikiResult.value : [];
  if (wikiResult.status === "fulfilled") sourcesSearched.push("Wikipedia/Wikidata API");

  pushEntry(await fetchZhWikiEntry(personName));

  const MAX_LOOKUP_CANDIDATES = 15;
  let candidates = dedupeCandidates([
    ...cached,
    ...entries.map((e) => entryToCandidate(e, personName)),
    ...wikiCandidates.map(wikiApiCandidateToCandidate),
  ]);

  candidates = mergeRegistryCandidates(personName, candidates);
  candidates = filterCandidatesByExactPersonName(candidates, personName);
  if (companyHint) {
    candidates = rankCandidatesByCompanyHint(candidates, companyHint);
  }
  candidates = candidates.slice(0, MAX_LOOKUP_CANDIDATES);
  candidates = dedupeCandidates(candidates).slice(0, MAX_LOOKUP_CANDIDATES);

  if (!cached.length && candidates.length) {
    await writePersonKnowledgeCache(personName, candidates);
  }

  const registry = getRegistryDisambiguation(personName);
  const allowCompare = candidates.length >= 2 || Boolean(registry?.allowCompare);

  const displayName = parsed.displayName || personName;
  let reason = registry?.question || buildReason(displayName, candidates.length, [...new Set(sourcesSearched)]);
  if (personName !== name.trim() && candidates.length > 0) {
    reason = `已按姓名「${personName}」检索${companyHint ? `（单位线索：${companyHint}）` : ""}。${reason}`;
  } else if (personName !== name.trim() && candidates.length === 0) {
    reason = `「${displayName}」未直接命中百科，已尝试按姓名「${personName}」检索仍无明确候选。请确认是否按您提供的资料生成。`;
  }

  return {
    name: displayName,
    candidates,
    reason,
    allowCompare,
    sourcesSearched: [...new Set(sourcesSearched)],
    needsConfirmation: true,
  };
}

export function parseCandidateUrl(candidateId: string): { type: string; url: string } | null {
  const sep = candidateId.indexOf(":");
  if (sep <= 0) return null;
  const type = candidateId.slice(0, sep);
  const encoded = candidateId.slice(sep + 1);
  if (type !== "baike" && type !== "wiki") return null;
  try {
    return { type, url: decodeURIComponent(encoded) };
  } catch {
    return null;
  }
}

export async function resolveEncyclopediaCandidate(
  name: string,
  candidateId: string,
): Promise<{
  identityHint: string;
  baikeUrl?: string;
  wikiUrl?: string;
  entry?: EnrichedSource;
  registryCandidate?: RegistryPersonCandidate | null;
}> {
  if (candidateId === "self-provided") return { identityHint: name.trim() };

  const registryCandidate = resolveRegistryCandidate(name, candidateId);
  if (registryCandidate) {
    return { identityHint: registryCandidate.identityHint, registryCandidate };
  }

  const parsed = parseCandidateUrl(candidateId);
  if (!parsed) {
    if (candidateId.startsWith("wikidata:")) {
      return { identityHint: `Wikidata entity: ${candidateId.slice("wikidata:".length)}` };
    }
    return { identityHint: name.trim() };
  }

  if (parsed.type === "baike") {
    const entry = await fetchBaikeFromUrl(parsed.url, name);
    const hint = entry
      ? [entry.title.replace(/ - 百度百科$/, ""), entry.snippet.slice(0, 120)].filter(Boolean).join(" · ")
      : parsed.url;
    return { identityHint: hint, baikeUrl: parsed.url, entry: entry || undefined };
  }

  if (parsed.type === "wiki") {
    const entry = await fetchOfficialWikipediaEntry(parsed.url, name);
    return {
      identityHint: entry
        ? [entry.title.replace(/ - Wikipedia$/, ""), entry.snippet.slice(0, 120)].join(" · ")
        : `Wikipedia entry: ${parsed.url}`,
      wikiUrl: parsed.url,
      entry: entry || undefined,
    };
  }

  return { identityHint: name.trim() };
}

export function buildSelfProvidedCandidate(name: string, rawText?: string): PersonCandidate {
  const summary = rawText?.trim().slice(0, 200) || "百科暂未收录，将依据您粘贴的资料生成";
  return {
    id: "self-provided",
    label: `按您提供的资料生成（${name.trim()}）`,
    snippet: summary,
    summary,
    source: "manual",
    confidence: 0.5,
  };
}
