import { callAIJson } from "@/lib/ai/client";
import {
  buildPersonBioSystemPrompt,
  buildPersonResearchContextBlock,
  PERSON_BIO_SOURCE_RULES,
} from "@/lib/ai/person-bio-prompt";

const ENCYCLOPEDIA_TASK = `
你的任务：根据下方「百科 + 全网权威文章」素材，**用 AI 重新撰写**一篇结构清晰、适合个人网页名片的人物百科式介绍。
要求：
1. **禁止**把新闻摘要、财经快讯、门户评论直接拼接；输入中若混有低质内容，一律忽略。
2. 按时间线组织：出生与早年 → 教育与起步 → 创业/职业转折 → 代表企业与职务 → 主要成就 → 理念与影响力。
3. 像优秀人物词条一样写：客观、信息密度高、有逻辑，每段围绕一个主题，段首可有概括句；简介质感参考「马云」这类成熟企业家词条，但必须基于当前人物事实。
4. 必须写真实人名、公司名、年份、产品名；无依据的不写。
5. 可用「据公开资料」自然带过来源，但不要每句都标注。
6. 输出必须是合法 JSON，字段完整，long_bio **1000-2000 字**（不得少于 1000 字），bio 150-200 字。
7. 若已确认身份，**严禁**写入与该身份无关的城市新闻、政府公告、其他同名人物信息。`;

const CARD_JSON_SCHEMA = `{
  "name": "",
  "title": "",
  "company": "",
  "brand_slogan": "",
  "bio": "",
  "long_bio": "",
  "phone": "",
  "email": "",
  "wechat": "",
  "address": "",
  "services": [],
  "experiences": [{"title":"","content":""}],
  "honors": [],
  "cases": [],
  "profile_sections": [{"type":"story","title":"","content":""}],
  "suggested_theme": "brand_orange",
  "missing_fields": []
}`;

export async function generatePersonBioFromBaike(
  name: string,
  baikeContext: string,
  rawText: string,
  identityHint?: string,
): Promise<Record<string, unknown>> {
  const contextBlock = buildPersonResearchContextBlock(baikeContext);
  const identityBlock = identityHint ? `\n\n已确认身份：${identityHint}` : "";
  const userBlock = rawText.trim()
    ? `\n\n用户提供的补充资料（仅采纳与百科一致的事实）：\n${rawText.slice(0, 2000)}`
    : "";

  return callAIJson<Record<string, unknown>>(
    `${buildPersonBioSystemPrompt("card")}

${ENCYCLOPEDIA_TASK}

${PERSON_BIO_SOURCE_RULES}

只返回 JSON，不要 markdown。`,
    `人物：${name}${identityBlock}${userBlock}

${contextBlock}

返回 JSON 格式：
${CARD_JSON_SCHEMA}`,
  );
}
