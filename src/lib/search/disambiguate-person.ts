import {
  getRegistryDisambiguation,
  registryCandidatesAsPersonCandidates,
  resolveRegistryCandidate,
  type RegistryPersonCandidate,
} from "@/lib/search/person-disambiguation-registry";
import type { SearchResult } from "@/lib/search/web-search";

export type PersonCandidate = {
  id: string;
  label: string;
  title?: string;
  company?: string;
  snippet: string;
  url?: string;
  region?: string;
  source?: string;
  summary?: string;
  confidence?: number;
};

export type PersonDisambiguationResult = {
  needsConfirmation: boolean;
  riskLevel: "low" | "high";
  candidates: PersonCandidate[];
  reason?: string;
  allowCompare?: boolean;
  fromRegistry?: boolean;
};

/** é«˜é¢‘é‡åå§“åï¼ˆ2-3 å­—å¸¸è§åï¼‰ */
const COMMON_NAMES = new Set([
  "å¼ ä¼Ÿ", "çŽ‹ä¼Ÿ", "æŽå¨œ", "çŽ‹èŠ³", "åˆ˜ä¼Ÿ", "æŽå¼º", "çŽ‹é™", "æŽå†›", "çŽ‹ç£Š", "æŽæ°",
  "å¼ æ•", "çŽ‹æ¶›", "æŽæ´‹", "å¼ ç£Š", "çŽ‹è¶…", "æŽå‹‡", "å¼ å†›", "çŽ‹å‹‡", "æŽè‰³", "å¼ æ¶›",
  "çŽ‹å¨Ÿ", "å¼ è¶…", "æŽæ•", "çŽ‹ç§€", "å¼ ä¸½", "æŽéœž", "çŽ‹çŽ²", "å¼ è‰³", "æŽä¸½", "çŽ‹ä¸¹",
  "é™ˆé™", "é™ˆæ˜Ž", "é™ˆå¼º", "åˆ˜æ´‹", "åˆ˜æ•", "èµµæ•", "èµµå¼º", "é»„ä¼Ÿ", "å‘¨æ°", "å´ç£Š",
]);

const IDENTITY_KEYWORDS = [
  "ä¼ä¸šå®¶", "åˆ›å§‹äºº", "CEO", "è‘£äº‹é•¿", "æ€»è£", "æ•™æŽˆ", "åšå£«", "å¾‹å¸ˆ", "åŒ»ç”Ÿ",
  "æ¼”å‘˜", "æ­Œæ‰‹", "ä½œå®¶", "è®°è€…", "å®˜å‘˜", "å¸‚é•¿", "å±€é•¿", "é™¢å£«", "å·¥ç¨‹å¸ˆ",
  "è®¾è®¡å¸ˆ", "é¡¾é—®", "ä¸»æ’­", "ç½‘çº¢", "è¿åŠ¨å‘˜", "æ•™ç»ƒ",
];

function extractIdentityHint(text: string): string | null {
  for (const kw of IDENTITY_KEYWORDS) {
    if (text.includes(kw)) return kw;
  }
  return null;
}

function buildCandidateFromResult(result: SearchResult, index: number): PersonCandidate {
  const combined = `${result.title} ${result.snippet}`;
  const titleMatch = combined.match(
    /(?:æ‹…ä»»|ä»»|ä¸º|æ˜¯)([^ï¼Œã€‚ï¼›\n]{2,24}(?:è‘£äº‹é•¿|CEO|æ€»è£|åˆ›å§‹äºº|æ•™æŽˆ|å¾‹å¸ˆ|åŒ»ç”Ÿ|ç»ç†|æ€»ç›‘|å¸‚é•¿|ç§˜ä¹¦é•¿))/,
  );
  const companyMatch = combined.match(
    /([\u4e00-\u9fffA-Za-z0-9ï¼ˆï¼‰()Â·]{2,20}(?:å…¬å¸|é›†å›¢|å¤§å­¦|å­¦é™¢|åŒ»é™¢|ç ”ç©¶æ‰€|åŸºé‡‘ä¼š|å¸‚æ”¿åºœ|äººæ°‘æ”¿åºœ))/,
  );

  return {
    id: `web-c${index}`,
    label: result.title.replace(/\s*[-_|].*$/, "").slice(0, 40) || `å€™é€‰ ${index + 1}`,
    title: titleMatch?.[1],
    company: companyMatch?.[1],
    snippet: result.snippet.slice(0, 160),
    url: result.url,
  };
}

export function isCommonName(name: string): boolean {
  const trimmed = name.trim();
  return COMMON_NAMES.has(trimmed) || (trimmed.length === 2 && !trimmed.includes("Â·"));
}

/** ä¼˜å…ˆæŸ¥æ³¨å†Œè¡¨ï¼›æ³¨å†Œè¡¨äººç‰©å¿…é¡»ç¡®è®¤èº«ä»½ */
export function analyzePersonDisambiguation(
  name: string,
  results: SearchResult[] = [],
): PersonDisambiguationResult {
  const registry = getRegistryDisambiguation(name);
  if (registry) {
    return {
      needsConfirmation: true,
      riskLevel: "high",
      candidates: registryCandidatesAsPersonCandidates(registry),
      reason: registry.question,
      allowCompare: registry.allowCompare,
      fromRegistry: true,
    };
  }

  return analyzePersonAmbiguityFromWeb(name, results);
}

export function analyzePersonAmbiguity(
  name: string,
  results: SearchResult[],
): PersonDisambiguationResult {
  return analyzePersonDisambiguation(name, results);
}

function analyzePersonAmbiguityFromWeb(
  name: string,
  results: SearchResult[],
): PersonDisambiguationResult {
  const candidates = results
    .slice(0, 8)
    .map((r, i) => buildCandidateFromResult(r, i))
    .filter((c) => c.snippet.length > 10);

  const identityHints = new Set<string>();
  for (const r of results.slice(0, 12)) {
    const hint = extractIdentityHint(`${r.title} ${r.snippet}`);
    if (hint) identityHints.add(hint);
  }

  const hasBaike = results.some((r) => r.url.includes("baike.baidu.com"));
  const common = isCommonName(name);
  const multiIdentity = identityHints.size >= 3;

  if (common && !hasBaike) {
    return {
      needsConfirmation: true,
      riskLevel: "high",
      candidates: dedupeCandidates(candidates),
      reason: `ã€Œ${name}ã€æ˜¯å¸¸è§å§“åï¼Œä¸”æœªæ‰¾åˆ°æƒå¨ç™¾ç§‘æ¡ç›®ï¼Œè¯·ç¡®è®¤æ˜¯ä»¥ä¸‹å“ªä¸€ä½ã€‚`,
    };
  }

  if (common && multiIdentity) {
    return {
      needsConfirmation: true,
      riskLevel: "high",
      candidates: dedupeCandidates(candidates),
      reason: `ã€Œ${name}ã€æ£€ç´¢åˆ°å¤šç§ä¸åŒèº«ä»½ï¼ˆ${[...identityHints].slice(0, 4).join("ã€")}ï¼‰ï¼Œè¯·ç¡®è®¤ç›®æ ‡äººç‰©ã€‚`,
    };
  }

  if (multiIdentity && candidates.length >= 4) {
    return {
      needsConfirmation: true,
      riskLevel: "high",
      candidates: dedupeCandidates(candidates),
      reason: `ç½‘ä¸Šå…³äºŽã€Œ${name}ã€çš„ä¿¡æ¯æŒ‡å‘å¤šä¸ªä¸åŒäººç‰©ï¼Œè¯·ç¡®è®¤åŽå†ç”Ÿæˆã€‚`,
    };
  }

  return { needsConfirmation: false, riskLevel: "low", candidates: [] };
}

export function resolvePersonCandidate(
  name: string,
  candidateId: string,
  webResults: SearchResult[] = [],
): { identityHint: string; candidate?: RegistryPersonCandidate } {
  const registryCandidate = resolveRegistryCandidate(name, candidateId);
  if (registryCandidate) {
    return { identityHint: registryCandidate.identityHint, candidate: registryCandidate };
  }

  const webCandidate = analyzePersonAmbiguityFromWeb(name, webResults).candidates.find(
    (c) => c.id === candidateId,
  );
  if (webCandidate) {
    return {
      identityHint: [webCandidate.label, webCandidate.title, webCandidate.company]
        .filter(Boolean)
        .join(" Â· "),
    };
  }

  return { identityHint: "" };
}

function dedupeCandidates(candidates: PersonCandidate[]): PersonCandidate[] {
  const seen = new Set<string>();
  return candidates.filter((c) => {
    const key = `${c.label}|${c.company || ""}|${c.title || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

