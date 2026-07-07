import {
  CARD_THEMES,
  ParsedCardInfoSchema,
  type CardTheme,
  type ParsedCardInfo,
} from "@/lib/schemas/card";
import { isIncompleteContent, splitResearchParagraphs } from "@/lib/search/research-excerpt";
import { resolvePersonName } from "@/lib/pipeline/person-content-pipeline";

const VALID_THEMES = new Set<string>(CARD_THEMES);

function asString(value: unknown, fallback = ""): string {
  if (value == null) return fallback;
  return String(value).trim();
}

function asStringArray(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.map((item) => asString(item)).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }
  return [];
}

function asSectionArray(value: unknown): Array<{ title: string; content: string }> {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      const title = asString(o.title);
      const content = asString(o.content);
      if (!title && !content) return null;
      return { title, content };
    })
    .filter(Boolean) as Array<{ title: string; content: string }>;
}

function asProfileSections(
  value: unknown,
): Array<{ type: string; title: string; content: string }> {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, i) => {
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      return {
        type: asString(o.type) || `section_${i}`,
        title: asString(o.title),
        content: asString(o.content),
      };
    })
    .filter((s) => s && (s.title || s.content)) as Array<{
    type: string;
    title: string;
    content: string;
  }>;
}

function normalizeTheme(value: unknown): CardTheme {
  const theme = asString(value);
  if (VALID_THEMES.has(theme)) return theme as CardTheme;
  return "brand_orange";
}

export function summarizeBio(text: string, maxLen = 200): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  if (trimmed.length <= maxLen) return trimmed;
  const sentences = trimmed.match(/[^。！？.!?]+[。！？.!?]?/g) || [trimmed];
  let result = "";
  for (const s of sentences) {
    if (result && (result + s).length > maxLen) break;
    result += s;
  }
  return result || trimmed;
}

function splitBaikeParagraphs(text: string): string[] {
  return text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length >= 40 && !/^(来源|正文|【)/.test(p));
}

export function normalizeParsedCardRaw(raw: unknown, rawText: string): ParsedCardInfo {
  const data = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return ParsedCardInfoSchema.parse({
    name: asString(data.name) || resolvePersonName(rawText).name,
    title: asString(data.title),
    company: asString(data.company),
    brand_slogan: asString(data.brand_slogan),
    bio: asString(data.bio),
    phone: asString(data.phone),
    email: asString(data.email),
    wechat: asString(data.wechat),
    address: asString(data.address),
    services: asStringArray(data.services),
    experiences: asSectionArray(data.experiences),
    honors: asSectionArray(data.honors),
    cases: asSectionArray(data.cases),
    long_bio: asString(data.long_bio),
    profile_sections: asProfileSections(data.profile_sections),
    suggested_theme: normalizeTheme(data.suggested_theme),
    missing_fields: asStringArray(data.missing_fields),
  });
}

export function ensureLongContent(
  parsed: ParsedCardInfo,
  rawText: string,
  researchContext?: string,
  options?: { baikeOnly?: boolean },
): ParsedCardInfo {
  const minLong = 1000;
  let longBio = parsed.long_bio.trim();

  if (isIncompleteContent(longBio, 80)) longBio = "";

  let bio = parsed.bio.trim();
  if (isIncompleteContent(bio, 60)) bio = "";
  if (bio.length > 280) {
    if (!longBio.includes(bio.slice(0, 80))) {
      longBio = bio + (longBio ? `\n\n${longBio}` : "");
    }
    bio = summarizeBio(bio);
  }
  if (!bio && longBio) bio = summarizeBio(longBio);

  const profileSections = parsed.profile_sections.map((section) => {
    if (!isIncompleteContent(section.content, 80)) return section;
    return { ...section, content: section.content || "" };
  });

  return ParsedCardInfoSchema.parse({ ...parsed, bio, long_bio: longBio, profile_sections: profileSections });
}

export function normalizeParsedCardFromBio(
  raw: unknown,
  rawText: string,
  researchContext?: string,
): ParsedCardInfo {
  return ensureLongContent(normalizeParsedCardRaw(raw, rawText), rawText, researchContext, {
    baikeOnly: true,
  });
}
