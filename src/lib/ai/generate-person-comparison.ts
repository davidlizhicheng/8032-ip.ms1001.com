import { callAIJson } from "@/lib/ai/client";
import { buildPersonBioSystemPrompt, PERSON_BIO_SOURCE_RULES } from "@/lib/ai/person-bio-prompt";
import { gatherPersonResearchForCard } from "@/lib/search/gather-person-research";
import type { RegistryPersonCandidate } from "@/lib/search/person-disambiguation-registry";
import { pickPersonResearchContext } from "@/lib/search/baike-context";

const COMPARE_SCHEMA = `{
  "title": "重名人物对比：XXX",
  "summary": "250-400字对比摘要",
  "long_content": "1000-2000字主体对比正文",
  "sections": [
    {"title": "身份定位对比", "content": "200-350字"},
    {"title": "地域与领域", "content": "200-350字"},
    {"title": "主要经历对比", "content": "250-400字"},
    {"title": "成就与影响力", "content": "200-350字"},
    {"title": "如何区分两位同名者", "content": "150-250字"}
  ]
}`;

export type PersonComparisonResult = {
  title: string;
  summary: string;
  long_content: string;
  sections: Array<{ title: string; content: string }>;
  candidates: Array<{ id: string; label: string; region: string }>;
};

async function researchForCandidate(name: string, candidate: RegistryPersonCandidate) {
  const research = await gatherPersonResearchForCard(name, { candidate });
  return pickPersonResearchContext({
    baikeEntries: research.baikeEntries,
    wiki: research.wiki,
    contextText: research.contextText,
  });
}

export async function generatePersonComparison(
  name: string,
  candidates: RegistryPersonCandidate[],
): Promise<PersonComparisonResult> {
  if (candidates.length < 2) {
    throw new Error("至少需要两位候选人物才能对比");
  }

  const contexts = await Promise.all(
    candidates.map(async (c) => ({
      candidate: c,
      context: await researchForCandidate(name, c),
    })),
  );

  const contextBlock = contexts
    .map(
      ({ candidate, context }, i) =>
        `【候选 ${i + 1}：${candidate.label}】\n身份：${candidate.identityHint}\n${context || candidate.snippet}`,
    )
    .join("\n\n---\n\n");

  const raw = await callAIJson<PersonComparisonResult>(
    `${buildPersonBioSystemPrompt("entity")}

你的任务：对同名人物「${name}」的${candidates.length}位候选者做**严格区分**的对比分析。
规则：
1. 只写与各位候选身份一致的事实；无依据的不写
2. long_content 必须 1000-2000 字，sections 合计也应在 1000 字以上
3. 禁止把深圳品牌专家与湖北官员混为一谈
4. 禁止政府门户首页垃圾、城市新闻、无关旅游帖
5. 最后必须写清「如何区分两位同名者」
${PERSON_BIO_SOURCE_RULES}
只返回 JSON。`,
    `请对比以下同名人物资料，生成结构化对比：

${contextBlock}

返回 JSON：
${COMPARE_SCHEMA}`,
  );

  return {
    title: raw.title || `重名人物对比：${name}`,
    summary: raw.summary || "",
    long_content: raw.long_content || "",
    sections: raw.sections || [],
    candidates: candidates.map((c) => ({
      id: c.id,
      label: c.label,
      region: c.region,
    })),
  };
}
