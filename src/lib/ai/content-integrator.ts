import { callAIJson, callAIText, isAIConfigured } from "@/lib/ai/client";
import { isPublishableContent, looksLikeRawEncyclopediaDump } from "@/lib/content/source-clean";
import { isIncompleteContent, isPlaceholderContent } from "@/lib/search/research-excerpt";
import { sanitizeText } from "@/lib/content/sanitize-placeholder";
import type { EntityType } from "@/lib/schemas/entity";

export const CONTENT_REWRITE_RULES = `
内容整合规则（必须严格遵守）：
1. 基于下方权威资料中的**事实**重新撰写，禁止照抄百科原文、禁止粘贴页面导航/脚注/参考文献/分类目录。
2. 像专业编辑整理过的介绍：分节清晰、语言流畅、信息密度高，每段围绕一个主题。
3. 保留可核对的人名、公司名、年份、地名、数据；无依据的不写。
4. 禁止「待补充」「资料不足」「行业领军人物」等空话套话。
5. 写到完整句落（。！？）再结束，严禁句中截断。`;

export function contentNeedsRewrite(text?: string | null, minLen = 120): boolean {
  const t = text?.trim() || "";
  if (!t) return true;
  if (isPlaceholderContent(t)) return true;
  if (isIncompleteContent(t, minLen)) return true;
  if (looksLikeRawEncyclopediaDump(t)) return true;
  if (!isPublishableContent(t)) return true;
  return false;
}

export async function rewriteSectionFromResearch(options: {
  name: string;
  sectionTitle: string;
  entityType: EntityType | "card";
  researchContext: string;
  minChars?: number;
}): Promise<string> {
  if (!isAIConfigured()) {
    throw new Error("NO_AI_CLIENT");
  }

  const minChars = options.minChars ?? 200;
  const userPrompt = `请为「${options.name}」撰写「${options.sectionTitle}」一节内容（${minChars}-500 字）。

${CONTENT_REWRITE_RULES}

权威资料（仅作事实依据，禁止照抄）：
${options.researchContext.slice(0, 14000)}

只输出正文，不要标题、不要 markdown、不要 JSON。`;

  const text = await callAIText(
    `你是品牌档案内容编辑，将公开资料整理成可读、可发布的介绍正文。${CONTENT_REWRITE_RULES}`,
    userPrompt,
  );

  const cleaned = sanitizeText(text.trim());
  if (contentNeedsRewrite(cleaned, minChars)) {
    throw new Error("AI_REWRITE_QUALITY_LOW");
  }
  return cleaned;
}

export async function repairEntitySections(
  name: string,
  type: EntityType,
  sections: Array<{ type: string; title: string; content: string }>,
  researchContext: string,
): Promise<Array<{ type: string; title: string; content: string }>> {
  if (!isAIConfigured() || !researchContext?.trim()) return sections;

  const out: Array<{ type: string; title: string; content: string }> = [];
  for (const section of sections) {
    if (!contentNeedsRewrite(section.content, type === "person" ? 150 : 100)) {
      out.push(section);
      continue;
    }
    try {
      const content = await rewriteSectionFromResearch({
        name,
        sectionTitle: section.title,
        entityType: type,
        researchContext,
        minChars: type === "person" ? 180 : 150,
      });
      out.push({ ...section, content });
    } catch {
      out.push(section);
    }
  }
  return out;
}

export async function repairSummaryFromResearch(
  name: string,
  type: EntityType,
  summary: string | undefined,
  researchContext: string,
): Promise<string> {
  if (!contentNeedsRewrite(summary, 150)) return summary?.trim() || "";
  if (!isAIConfigured() || !researchContext?.trim()) return summary?.trim() || "";

  try {
    return await rewriteSectionFromResearch({
      name,
      sectionTitle: type === "city" ? "城市概述" : type === "person" ? "人物概述" : "概述",
      entityType: type,
      researchContext,
      minChars: 200,
    });
  } catch {
    return summary?.trim() || "";
  }
}

export async function rewriteLongBioFromResearch(
  name: string,
  researchContext: string,
  identityHint?: string,
): Promise<string> {
  const identity = identityHint ? `\n已确认身份：${identityHint}` : "";
  const result = await callAIJson<{ long_bio?: string }>(
    `你是个人品牌档案编辑。${CONTENT_REWRITE_RULES}
只返回 JSON：{"long_bio": "1000-2000字完整介绍"}`,
    `人物：${name}${identity}

${researchContext.slice(0, 16000)}

请撰写 long_bio（1000-2000 字，按时间线整合，禁止照抄百科原文）。`,
  );
  const bio = sanitizeText(result.long_bio || "");
  if (contentNeedsRewrite(bio, 800)) throw new Error("AI_LONG_BIO_QUALITY_LOW");
  return bio;
}
