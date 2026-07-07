import { callAIJson, getAIClient } from "@/lib/ai/client";
import {
  CARD_THEMES,
  ParsedCardInfoSchema,
  type CardTheme,
  type ParsedCardInfo,
} from "@/lib/schemas/card";
import type { PersonCandidate } from "@/lib/search/disambiguate-person";
import {
  resolveRegistryCandidate,
  type RegistryPersonCandidate,
} from "@/lib/search/person-disambiguation-registry";
import {
  buildSelfProvidedCandidate,
  lookupPersonCandidatesFromEncyclopedia,
  resolveEncyclopediaCandidate,
} from "@/lib/search/lookup-person-encyclopedia";
import { generatePersonComparison } from "@/lib/ai/generate-person-comparison";
import { gatherFamousPersonMedia } from "@/lib/search/famous-person-media";
import type { FamousPersonMedia } from "@/lib/search/famous-person-media";
import { gatherPersonMediaFallback } from "@/lib/search/person-media-fallback";
import { isIncompleteContent } from "@/lib/search/research-excerpt";
import {
  buildPersonBioSystemPrompt,
  buildPersonResearchContextBlock,
} from "@/lib/ai/person-bio-prompt";
import { generatePersonBioFromBaike } from "@/lib/ai/generate-person-bio";
import {
  normalizeParsedCardFromBio,
  normalizeParsedCardRaw,
  ensureLongContent,
  summarizeBio,
} from "@/lib/ai/parse-card-normalize";
import {
  runPersonLookupPipeline,
  formatFactBundleForIntegration,
  resolvePersonName,
} from "@/lib/pipeline/person-content-pipeline";
import { integratePersonCardContent } from "@/lib/pipeline/integrate-person-content";
import type { PipelineStepLog } from "@/lib/pipeline/types";

const VALID_THEMES = new Set<string>(CARD_THEMES);

export type ParseCardOptions = {
  rawText: string;
  enrichFromWeb?: boolean;
  confirmedCandidateId?: string;
  confirmedIdentityHint?: string;
  compareMode?: boolean;
  compareCandidateIds?: string[];
};

export type ParseCardResponse =
  | {
      status: "success";
      data: ParsedCardInfo;
      sourcesUsed?: number;
      researchSteps?: import("@/lib/search/research-types").ResearchStep[];
      famousMedia?: FamousPersonMedia | null;
      identityHint?: string;
    }
  | {
      status: "needs_confirmation";
      name: string;
      riskLevel: "high" | "low";
      reason: string;
      candidates: PersonCandidate[];
      allowCompare?: boolean;
    }
  | {
      status: "comparison";
      name: string;
      comparison: import("@/lib/ai/generate-person-comparison").PersonComparisonResult;
    };

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
  if (value == null) return [];
  if (!Array.isArray(value)) {
    if (typeof value === "string" && value.trim()) {
      return [{ title: "经历", content: value.trim() }];
    }
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === "string") {
        return { title: "经历", content: item.trim() };
      }
      if (item && typeof item === "object") {
        const row = item as Record<string, unknown>;
        return {
          title: asString(row.title || row.name, "经历"),
          content: asString(row.content || row.description || row.text),
        };
      }
      return { title: "", content: "" };
    })
    .filter((item) => item.title || item.content);
}

function asProfileSections(
  value: unknown,
): Array<{ type: string; title: string; content: string }> {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const title = asString(row.title);
      const content = asString(row.content);
      if (!title && !content) return null;
      return {
        type: asString(row.type, "story"),
        title: title || "详细介绍",
        content,
      };
    })
    .filter(Boolean) as Array<{ type: string; title: string; content: string }>;
}

function extractNameFromText(rawText: string): string {
  return resolvePersonName(rawText).name;
}

export { normalizeParsedCardFromBio } from "@/lib/ai/parse-card-normalize";

const BASE_RULES = `规则：
1. 只提取资料中明确出现的信息；联系方式（手机/邮箱/微信/地址）绝不编造，没有则留空并在 missing_fields 标注
2. brand_slogan：15-30字，有品牌感
3. bio：150-200字精炼概述
4. long_bio：800-1200字深度个人介绍，有机整合经历、理念、业务、成就，段落清晰，禁止空话套话
5. profile_sections：3-6 个模块，每模块 150-350 字，如「成长经历」「专业领域」「服务理念」「代表成果」「社会影响力」等
6. experiences / honors / cases：每项 content 至少 150 字，写具体事实
7. services：具体服务项目列表
8. 全文（long_bio + profile_sections + experiences + cases 等）总字数目标 1000-2000 字
9. suggested_theme 必须是：professional_light / brand_orange / brand_purple / education_blue / creator_bold / poster_showcase 之一（默认 brand_orange，不要用深色主题）
10. 所有数组字段必须返回，无内容时用 []
11. **严禁截断**：任何字符串字段必须写到完整句落（以。！？结尾）再结束，绝不允许在句中或词中停止输出`;

const JSON_SCHEMA = `{
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

export function mockParseCardInfo(rawText: string): ParsedCardInfo {
  const phoneMatch = rawText.match(/1[3-9]\d{9}/);
  const emailMatch = rawText.match(/[\w.-]+@[\w.-]+\.\w+/);
  const name = extractNameFromText(rawText);

  return ParsedCardInfoSchema.parse({
    name,
    title: "个人品牌顾问",
    company: rawText.includes("有限公司")
      ? rawText.match(/[\u4e00-\u9fff]+有限公司/)?.[0] || ""
      : "",
    brand_slogan: "用专业影响力，连接信任与增长",
    bio: summarizeBio(rawText) || "专注于个人品牌建设与业务增长。",
    long_bio: rawText.trim() || rawText,
    phone: phoneMatch?.[0] || "",
    email: emailMatch?.[0] || "",
    wechat: "",
    address: "",
    services: ["品牌咨询", "业务介绍", "客户对接"],
    experiences: [
      {
        title: "职业经历",
        content: rawText.slice(0, 400) || "丰富的行业实践经验。",
      },
    ],
    honors: [],
    cases: [],
    profile_sections: [
      {
        type: "expertise",
        title: "专业领域",
        content: rawText.slice(0, 500) || rawText.slice(0, 500),
      },
    ],
    suggested_theme: "brand_orange",
    missing_fields: [
      ...(!phoneMatch ? ["phone"] : []),
      ...(!emailMatch ? ["email"] : []),
      "wechat",
      "address",
    ],
  });
}

async function runAIParse(
  rawText: string,
  researchContext?: string,
  identityHint?: string,
  baikeOnly = false,
): Promise<ParsedCardInfo> {
  const webBlock = buildPersonResearchContextBlock(researchContext || "");
  const identityBlock = identityHint
    ? `\n\n用户已确认目标人物身份：${identityHint}`
    : "";

  const parsed = await callAIJson<unknown>(
    buildPersonBioSystemPrompt("card"),
    `请解析并深度扩写以下个人资料，生成 1000-2000 字的有机整合内容：\n\n${rawText}${webBlock}${identityBlock}

${BASE_RULES}

返回 JSON 格式：
${JSON_SCHEMA}`,
  );

  return ensureLongContent(
    normalizeParsedCardRaw(parsed, rawText),
    rawText,
    researchContext,
    { baikeOnly },
  );
}

async function runPersonEncyclopediaParse(
  name: string,
  rawText: string,
  baikeContext: string,
  identityHint?: string,
): Promise<ParsedCardInfo> {
  let parsed = await generatePersonBioFromBaike(name, baikeContext, rawText, identityHint);
  let normalized = normalizeParsedCardRaw(parsed, rawText);

  if (normalized.long_bio.trim().length < 900) {
    parsed = await generatePersonBioFromBaike(
      name,
      baikeContext,
      rawText,
      `${identityHint || ""}（请务必写满 long_bio 1000 字以上，只写已确认身份的人物，禁止无关内容）`.trim(),
    );
    normalized = normalizeParsedCardRaw(parsed, rawText);
  }

  return ensureLongContent(normalized, rawText, baikeContext, { baikeOnly: true });
}

export async function parseCardInfo(rawText: string): Promise<ParsedCardInfo> {
  const result = await parseCardWithOptions({ rawText });
  if (result.status === "needs_confirmation" || result.status === "comparison") {
    return mockParseCardInfo(rawText);
  }
  return result.data;
}

async function resolveCompareCandidate(
  name: string,
  candidateId: string,
  fallback?: PersonCandidate,
): Promise<RegistryPersonCandidate | null> {
  const registry = resolveRegistryCandidate(name, candidateId);
  if (registry) return registry;

  const resolved = await resolveEncyclopediaCandidate(name, candidateId);
  if (resolved.registryCandidate) return resolved.registryCandidate;

  const label = fallback?.label || name;
  const snippet = resolved.entry?.snippet || fallback?.snippet || label;
  return {
    id: candidateId,
    label,
    region: fallback?.region || "",
    title: fallback?.title,
    company: fallback?.company,
    snippet,
    identityHint: resolved.identityHint || label,
    searchQueries: [name, `${name} ${resolved.identityHint}`].filter(Boolean),
    excludeKeywords: [],
  };
}

export async function parseCardWithOptions(
  options: ParseCardOptions,
): Promise<ParseCardResponse> {
  const {
    rawText,
    enrichFromWeb,
    confirmedCandidateId,
    confirmedIdentityHint,
    compareMode,
    compareCandidateIds,
  } = options;
  const client = getAIClient();

  if (!client) {
    return { status: "success", data: mockParseCardInfo(rawText) };
  }

  const name = extractNameFromText(rawText);

  if (enrichFromWeb && compareMode) {
    const ids = compareCandidateIds?.filter(Boolean).slice(0, 2);
    if (ids?.length === 2) {
      const lookup = await lookupPersonCandidatesFromEncyclopedia(name);
      const picked = (
        await Promise.all(
          ids.map((id) => {
            const fallback = lookup.candidates.find((c) => c.id === id);
            return resolveCompareCandidate(name, id, fallback);
          }),
        )
      ).filter(Boolean) as RegistryPersonCandidate[];
      if (picked.length === 2) {
        try {
          const comparison = await generatePersonComparison(name, picked);
          return { status: "comparison", name, comparison };
        } catch (error) {
          console.error("[parse-card] comparison failed:", error);
        }
      }
    }
  }

  let researchContext = "";
  let baikeContext = "";
  let sourcesUsed = 0;
  let researchSteps: import("@/lib/search/research-types").ResearchStep[] = [];
  let identityHint = confirmedIdentityHint || "";
  let famousMedia: FamousPersonMedia | null = null;
  let researchBundle: import("@/lib/search/research-types").ResearchBundle | null = null;

  const pipelineSteps: PipelineStepLog[] = [];

  if (enrichFromWeb) {
    const pipeline = await runPersonLookupPipeline({
      rawText,
      enrichFromWeb: true,
      confirmedCandidateId,
      confirmedIdentityHint,
      onStep: (s) => pipelineSteps.push(s),
    });

    if (pipeline.status === "needs_confirmation") {
      return {
        status: "needs_confirmation",
        name: pipeline.name,
        riskLevel: "high",
        reason: pipeline.reason,
        candidates: pipeline.candidates,
        allowCompare: pipeline.allowCompare,
      };
    }

    identityHint = pipeline.identityHint;
    baikeContext = formatFactBundleForIntegration(pipeline.factBundle);
    researchContext = baikeContext;
    sourcesUsed = pipeline.factBundle.sourceCount;
    researchSteps = pipeline.steps.map((s) => ({
      phase: s.phase === "fetch" ? "baike" : s.phase === "integrate" ? "ai" : "search",
      label: s.label,
      detail: s.detail,
      status: s.status,
    }));

    researchBundle = {
      news: [],
      webResults: [],
      baikeEntries: pipeline.factBundle.baikeEntries,
      wiki: pipeline.factBundle.wiki,
      webCrawlPages: pipeline.factBundle.webCrawlPages,
      pageExcerpts: pipeline.factBundle.webCrawlPages,
      contextText: baikeContext,
      sourceCount: pipeline.factBundle.sourceCount,
      steps: researchSteps,
    };

    try {
      famousMedia =
        (await gatherFamousPersonMedia(pipeline.name, researchBundle)) ||
        (await gatherPersonMediaFallback(pipeline.name, {
          identityHint: pipeline.identityHint,
          summary: baikeContext.slice(0, 400),
        }));
    } catch (error) {
      console.warn("[parse-card] famous media failed:", error);
    }

    try {
      const data = await integratePersonCardContent(rawText, pipeline.factBundle, {
        onStep: (s) => pipelineSteps.push(s),
      });
      return {
        status: "success",
        data,
        sourcesUsed,
        researchSteps,
        famousMedia,
        identityHint,
      };
    } catch (error) {
      console.error("[parse-card] integrate failed:", error);
    }
  }

  try {
    const data = await runAIParse(rawText, researchContext, identityHint, false);
    return { status: "success", data, sourcesUsed, researchSteps, famousMedia, identityHint };
  } catch (error) {
    console.error("AI parse card fallback:", error);
    return { status: "success", data: mockParseCardInfo(rawText) };
  }
}
