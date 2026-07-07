/**
 * 18 步报告正文清洗：去 URL、引用、百科导航垃圾，保留可读干货
 */
import { decodeHtmlEntities } from "@/lib/content/decode-html";
import {
  cleanEncyclopediaText,
  isPublishableContent,
  looksLikeRawEncyclopediaDump,
} from "@/lib/content/source-clean";
import { isPlaceholderContent } from "@/lib/content/sanitize-placeholder";
import { coerceText } from "@/lib/content/coerce-text";

/** 去掉 markdown 链接、裸 URL、脚注、百科编辑链接等 */
export function stripUrlsAndCitations(text: string): string {
  let t = decodeHtmlEntities(text);

  t = t
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]*)\]\[[^\]]*\]/g, "$1")
    .replace(/https?:\/\/[^\s)\]<>"]+/gi, "")
    .replace(/IRC:\/\/[^\s]+/gi, "")
    .replace(/\[\[\d+\]\]/g, "")
    .replace(/\[\d+\]/g, "")
    .replace(/\[编辑\]/g, "")
    .replace(/\[.*?编辑.*?\]/g, "")
    .replace(/##\s*[^\n]+/g, "")
    .replace(/\|\s*---+\s*\|/g, "")
    .replace(/\|[^|\n]+\|/g, (row) => {
      const cells = row.split("|").map((c) => c.trim()).filter(Boolean);
      return cells.length <= 2 ? cells.join("：") : "";
    })
    .replace(/【\s*】\(\)/g, "")
    .replace(/【undefined】/g, "")
    .replace(/（摘自[^）]+）/g, "")
    .replace(/来源：[^\n]+/g, "")
    .replace(/\[证据 \d+\]/g, "")
    .replace(/\[权威资料 \d+\]/g, "");

  return t.replace(/\s+/g, " ").trim();
}

/** 报告单段正文 → 用户可见版本 */
export function sanitizeReportField(text?: string | null | unknown): string {
  const raw = coerceText(text);
  if (!raw.trim()) return "";

  let cleaned = stripUrlsAndCitations(raw);
  cleaned = cleanEncyclopediaText(cleaned, "web");

  if (!cleaned || looksLikeRawEncyclopediaDump(cleaned)) return "";
  if (!isPublishableContent(cleaned)) return "";
  if (isPlaceholderContent(cleaned)) return "";

  return cleaned.trim();
}

/** 报告摘要/定位等短字段：不要求 80 字，但拒绝百科 dump */
export function sanitizeReportMetaField(text?: string | null | unknown, maxLen = 400): string {
  const raw = coerceText(text);
  if (!raw.trim()) return "";

  let cleaned = stripUrlsAndCitations(raw);
  cleaned = cleanEncyclopediaText(cleaned, "web");

  if (!cleaned || looksLikeRawEncyclopediaDump(cleaned)) return "";
  if (isPlaceholderContent(cleaned)) return "";

  cleaned = cleaned.replace(/\s+/g, " ").trim();
  if (cleaned.length < 12) return "";
  if (cleaned.length > maxLen) {
    const cut = cleaned.slice(0, maxLen);
    const last = Math.max(cut.lastIndexOf("。"), cut.lastIndexOf("，"), cut.lastIndexOf("."));
    return (last > maxLen * 0.5 ? cut.slice(0, last + 1) : cut).trim();
  }
  return cleaned;
}

/** 从资料中提取首段可读摘要（兜底用） */
export function firstPublishableExcerpt(text: string | undefined, maxLen = 320): string {
  if (!text?.trim()) return "";
  const chunks = text.split(/\n\n+|[。！？]\s+/);
  for (const chunk of chunks) {
    const clean = sanitizeReportMetaField(chunk, maxLen);
    if (clean.length >= 24) return clean;
  }
  return sanitizeReportMetaField(text, maxLen);
}

export function sanitizeReportStep(step: Record<string, unknown>): Record<string, string> {
  const fields = [
    "learning_objectives",
    "theory_tools",
    "reference_cases",
    "brand_practice",
    "practical_training",
    "summary_lessons",
    "brand_case",
    "method_models",
  ] as const;

  const out: Record<string, string> = {};
  for (const key of fields) {
    const val = sanitizeReportField(step[key]);
    if (val) out[key] = val;
  }
  return out;
}
