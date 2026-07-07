/** 从检索上下文中切分可用段落，用于填充 AI 未生成的章节 */

import {
  isPlaceholderContent,
} from "@/lib/content/sanitize-placeholder";
import {
  cleanEncyclopediaText,
  isPublishableContent,
  looksLikeRawEncyclopediaDump,
} from "@/lib/content/source-clean";
import { sanitizeReportField } from "@/lib/content/report-sanitize";

export { isPlaceholderContent } from "@/lib/content/sanitize-placeholder";

/** 文本是否在句中被截断（常见于 AI 输出不完整） */
export function isIncompleteContent(text?: string | null, minComplete = 120): boolean {
  const t = text?.trim() || "";
  if (!t) return true;
  if (t.length < minComplete) return true;
  if (/[。！？.!?…]$/.test(t)) return false;
  if (t.length >= 350) return false;
  return true;
}

export function splitResearchParagraphs(context: string): string[] {
  if (!context?.trim()) return [];

  const baikeParas: string[] = [];
  for (const m of context.matchAll(/\[权威资料 \d+\][\s\S]*?正文：\s*([\s\S]*?)(?=\n\[权威资料|\n【|$)/g)) {
    const block = m[0];
    const isEncyclopedia = block.includes("百度百科") || block.includes("维基百科");
    const raw = m[1];
    const cleaned = cleanEncyclopediaText(
      raw,
      block.includes("维基百科") ? "wiki" : block.includes("百度百科") ? "baike" : "web",
    );
    if (!cleaned || looksLikeRawEncyclopediaDump(cleaned)) continue;
    for (const p of cleaned.split(/\n+/).map((s) => s.trim()).filter((s) => s.length >= 40)) {
      if (isPublishableContent(p)) baikeParas.push(p);
    }
    if (!isEncyclopedia && cleaned.length >= 80 && isPublishableContent(cleaned)) {
      baikeParas.push(cleaned.slice(0, 800));
    }
  }
  if (baikeParas.length >= 3) return baikeParas;

  const cleaned = context
    .replace(/\[权威资料 \d+\]/g, "\n")
    .replace(/\[证据 \d+\]/g, "\n")
    .replace(/来源：[^\n]+/g, "")
    .replace(/https?:\/\/[^\s]+/g, "")
    .replace(/可信度：[^\n]+/g, "")
    .replace(/正文：/g, "")
    .replace(/【[^】]+】/g, "\n");

  return cleaned
    .split(/\n+/)
    .map((p) => sanitizeReportField(p.replace(/^[-·•]\s*/, "")))
    .filter((p) => p.length >= 40);
}

export function excerptForSlot(
  context: string,
  slotLabel: string,
  slotIndex: number,
  minLength = 180,
): string {
  const paragraphs = splitResearchParagraphs(context);
  if (!paragraphs.length) return "";

  const keywords = slotLabel.replace(/[^\u4e00-\u9fffA-Za-z0-9]/g, " ").split(/\s+/).filter(Boolean);
  const scored = paragraphs.map((p, i) => {
    let score = 0;
    for (const kw of keywords) {
      if (kw.length >= 2 && p.includes(kw)) score += 2;
    }
    score += (i + slotIndex) % 3 === 0 ? 1 : 0;
    return { p, score, i };
  });

  scored.sort((a, b) => b.score - a.score || a.i - b.i);

  const chunks: string[] = [];
  let total = 0;
  for (const { p } of scored) {
    if (chunks.includes(p)) continue;
    chunks.push(p);
    total += p.length;
    if (total >= minLength) break;
  }

  if (!chunks.length) {
    const start = (slotIndex * 2) % Math.max(paragraphs.length, 1);
    for (let i = 0; i < 3 && start + i < paragraphs.length; i++) {
      chunks.push(paragraphs[start + i]);
    }
  }

  const body = chunks.join("\n\n");
  if (!body) return "";

  return sanitizeReportField(body);
}

export function fillSectionFromResearch(
  context: string | undefined,
  sectionTitle: string,
  sectionIndex: number,
): string {
  if (!context?.trim()) return "";
  return excerptForSlot(context, sectionTitle, sectionIndex, 200);
}

export function fillReportStepFromResearch(
  context: string | undefined,
  stepTitle: string,
  stepIndex: number,
  field:
    | "learning_objectives"
    | "theory_tools"
    | "reference_cases"
    | "brand_practice"
    | "practical_training"
    | "summary_lessons"
    | "method_models"
    | "brand_case",
): string {
  if (!context?.trim()) return "";

  const excerpt = excerptForSlot(context, `${stepTitle} ${field}`, stepIndex + field.length, 220);
  if (!excerpt) return "";

  const labels: Record<string, string> = {
    learning_objectives: "落地方法",
    theory_tools: "专业模型",
    reference_cases: "跨行业标杆案例",
    brand_practice: "本人物现状复盘",
    practical_training: "金句与落地作业",
    summary_lessons: "本掌核心要点",
    method_models: "方法参照",
    brand_case: "公开资料案例摘录",
  };

  const label = labels[field] || field;
  return `【${label}】${excerpt}`;
}
