import {
  GeneratedEntitySchema,
  GeneratedReportSchema,
  type GeneratedEntity,
  type GeneratedReport,
  type ReportStep,
  type EntityType,
  PERSON_SUBTYPE_LABELS,
} from "@/lib/schemas/entity";
import { callAIJson } from "@/lib/ai/client";
import { entitySlug } from "@/lib/ai/detect-type";
import { getDefaultEntityTheme } from "@/lib/themes";
import {
  BRAND_REPORT_SYSTEM_PROMPT,
  BRAND_SCORE_DIMENSIONS,
  BRAND_REVIEW_18_STEPS,
  STEP_SECTION_KEYS,
} from "@/lib/ai/brand-report-template";
import {
  getReportScoreDimensionsForType,
  getReportSectionKeysForType,
  getReportSystemPromptForType,
  getUnifiedStepDefs,
  isPersonalIpReport,
  reportTitleForEntity,
  type UnifiedStepDef,
} from "@/lib/ai/report-framework";
import { generateReportSegments } from "@/lib/ai/brand-report-segments";
import { BRAND_METHOD_CANONICAL_FLOW } from "@/lib/ai/brand-methodology";
import type { NewsItem } from "@/lib/news/fetcher";
import type { SearchResult } from "@/lib/search/web-search";
import {
  excerptForSlot,
  fillReportStepFromResearch,
  fillSectionFromResearch,
  isIncompleteContent,
  isPlaceholderContent,
  splitResearchParagraphs,
} from "@/lib/search/research-excerpt";
import { coerceText } from "@/lib/content/coerce-text";
import { sanitizeSections, sanitizeText } from "@/lib/content/sanitize-placeholder";
import {
  firstPublishableExcerpt,
  sanitizeReportField,
  sanitizeReportMetaField,
  sanitizeReportStep,
} from "@/lib/content/report-sanitize";
import { cleanEncyclopediaText } from "@/lib/content/source-clean";
import {
  CITY_BRAND_RESEARCH_HINTS,
  gatherCityBrandResearchContext,
} from "@/lib/search/gather-city-brand-research";
import { gatherEntityResearch } from "@/lib/search/gather-research";
import {
  buildPersonBioSystemPrompt,
  buildPersonResearchContextBlock,
  PERSON_BIO_SOURCE_RULES,
} from "@/lib/ai/person-bio-prompt";
import {
  CONTENT_REWRITE_RULES,
  contentNeedsRewrite,
  repairEntitySections,
  repairSummaryFromResearch,
} from "@/lib/ai/content-integrator";
import {
  buildPersonalIpFallbackField,
  buildPersonalIpFallbackStep,
} from "@/lib/ai/personal-ip-step-fallback";
import { getPersonalIpStepDef } from "@/lib/ai/personal-ip-18-template";

function buildResearchContext(
  news?: NewsItem[],
  researchContext?: string,
  options?: { baikeOnly?: boolean },
): string {
  if (researchContext?.trim()) {
    return buildPersonResearchContextBlock(researchContext);
  }

  if (options?.baikeOnly) return "";

  if (news?.length) {
    return `\n\n公开新闻报道摘要（仅作补充，不得替代百科正文）：\n${news.map((n) => `- ${n.title} (${n.source || "新闻"})`).join("\n")}`;
  }

  return "";
}

function mergeSources(
  news?: NewsItem[],
  webResults?: SearchResult[],
  aiSources?: GeneratedEntity["sources"],
): GeneratedEntity["sources"] {
  const fromNews =
    news?.map((n) => ({
      title: n.title,
      url: n.url,
      source_type: "news" as const,
      excerpt: n.excerpt,
      confidence_score: 0.75,
    })) || [];

  const fromWeb =
    webResults?.map((item) => ({
      title: item.title,
      url: item.url,
      source_type: (item.url.includes("baike.baidu.com") ? "wiki" : "web") as "wiki" | "web",
      excerpt: item.snippet,
      confidence_score: item.url.includes("baike.baidu.com") ? 0.95 : 0.8,
    })) || [];

  const merged = [...fromWeb, ...fromNews, ...(aiSources || [])];
  const seen = new Set<string>();

  const deduped = merged.filter((item) => {
    const key = (item.url || "").split("?")[0] || item.title.replace(/\s*[-_].*百度百科.*$/i, "").trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return deduped.slice(0, 8);
}

const QUALITY_RULES = `
内容质量规则（必须严格遵守）：
1. 严禁空话套话与占位语。禁止出现："待补充""资料不足""公开资料未明确提及""历史文化与现代都市风貌交融""集聚众多行业龙头"等
2. 人物档案 sections 合计 2000-4000 字；城市/企业 1000-2000 字；summary 250-400 字；每节 content 200-500 字，含可核对事实
3. 检索资料中有百度百科/维基百科/政府官网内容时，必须**基于事实重新撰写**，禁止照抄百科原文、禁止粘贴页面导航/脚注/参考文献
4. 找不到某维度资料时，从检索正文其他相关段落提炼改写；**禁止**写占位句
5. 城市差异化：深圳勿写千年古城；每座城市写真实数据、政策、地标、产业集群和公共传播动作。城市页可以写“代表企业”作为产业支撑事实，但不得把企业品牌案例当成城市品牌案例主体来套用
6. 品牌拆解和复盘必须做同类比较：城市对比同能级/同区域城市，企业对比同行业企业，人物对比同领域人物或同类型IP。必须说明为什么选这些对标对象、相似点、差异点，并在每个关键段落给出可执行结论
7. 代表企业、高校、职务、公司名、年份、数据必须写真实名称
8. **严禁截断**：任何 content/summary 字段必须写到完整句落（。！？）再结束，绝不允许在句中或词中停止，不要自我压缩篇幅
${PERSON_BIO_SOURCE_RULES}`;

const EVIDENCE_REPORT_RULES = `
资料闸门与写作闸门（必须严格遵守）：
1. 资料只作为证据卡使用，先判断来源、人物身份、可用于步骤，再写作；不要把原始网页或18掌教材整段搬进报告。
2. 人物类必须精确匹配姓名与已确认身份；出现同名/近名人物时，只保留与目标人物身份一致的材料。
3. 降龙18掌是分析框架，不是正文素材。正文要写目标人物的事实、资产、短板与建议，禁止复制“消费者研究、5W1H、AIDA”等教材段落。
4. 每一步必须回答四件事：已有品牌资产、基于证据的品牌判断、当前短板、下一步优化建议。
5. 没有证据的内容要写成谨慎建议，不得编造手机号、地址、荣誉、作品、项目、采访或数据。`;

const BASE_RULES = `
合规规则（必须遵守）：
1. 绝不编造手机号、微信号、私人邮箱、家庭住址、身份证号
2. 只基于提供的公开资料和新闻摘要整理，优先采用百度百科等权威来源
3. 官员类不做商业背书、不做财富分析
4. 律师类不写"包赢""最强""百分百胜诉"
5. 未成年人不展示联系方式
6. 返回合法 JSON，不要 markdown
${QUALITY_RULES}
${EVIDENCE_REPORT_RULES}`;

const CITY_SECTION_TITLES = [
  "城市定位",
  "产业优势",
  "代表企业",
  "高校与科研资源",
  "文旅资源",
  "营商环境",
  "城市品牌口号",
  "招商合作方向",
] as const;

const PERSON_SECTION_TITLES = [
  "个人简介",
  "早年经历",
  "职业生涯",
  "企业身份与职务",
  "创业历程",
  "商业成就",
  "关联企业与品牌",
  "行业影响力",
  "社会职务与荣誉",
  "公开报道摘录",
] as const;

const TYPE_PROMPTS: Record<EntityType, string> = {
  city: `生成中国城市品牌宣传档案。sections 必须恰好 8 节：城市定位、产业优势、代表企业、高校与科研资源、文旅资源、营商环境、城市品牌口号、招商合作方向。
全文 1000-2000 字。必须以百度百科/政府官网正文为骨架，按模块**用 AI 重新撰写**百科词条式内容；每节内容互不重复，禁止把同一段市情介绍复制到多个模块。城市类对标只能选同能级、同区域或同产业定位城市，禁止把企业案例当成城市案例主体。禁止「待抓取」「待补充」等占位语。`,
  company: `生成中国企业品牌档案。sections 必须包含：企业简介、品牌定位、核心产品、创始人与高管、商业模式、增长路径、品牌优势、竞品分析、风险与挑战、合作方向。必须写真实产品名、创始人姓名、成立年份、总部城市、具体竞品公司名。竞品分析必须选择同行业、同客群或同价格带企业，说明相关性、差异点和结论。`,
  person: `生成人物公开资料档案。sections 必须恰好 10 节：个人简介、早年经历、职业生涯、企业身份与职务、创业历程、商业成就、关联企业与品牌、行业影响力、社会职务与荣誉、公开报道摘录。
全文 2000-4000 字。必须基于百度百科/维基百科事实 **用 AI 重新撰写** 各节内容；禁止照抄百科原文。第 10 节仅 1-2 条权威报道标题级摘要。必须写真实职务、公司名、年份、可查证的公开经历。必须生成 relations 关联企业和城市。`,
  brand: `生成品牌档案。sections 包含：品牌故事、品牌定位、核心产品、目标用户、传播记忆点、代表案例、竞品对比。必须写真实产品、价格带、竞品品牌名。竞品对比必须选择同品类、同场景或同用户心智品牌，说明相关性、差异点和结论。`,
  profession: `生成职业群体介绍页。sections 包含：职业概述、核心能力、服务场景、行业价值、代表人物类型、合作方式。`,
};

function buildFallbackSections(
  name: string,
  type: EntityType,
  researchContext?: string,
): Array<{ type: string; title: string; content: string }> {
  const paragraphs = splitResearchParagraphs(researchContext || "");
  if (!paragraphs.length) {
    return [{
      type: "overview",
      title: `${name}概况`,
      content: `${name}公开品牌档案。`,
    }];
  }

  const titles: Record<EntityType, string[]> = {
    city: [...CITY_SECTION_TITLES],
    company: ["企业简介", "产品与业务", "发展历程", "公开资料摘录"],
    person: [...PERSON_SECTION_TITLES],
    brand: ["品牌概述", "产品线", "公开资料摘录"],
    profession: ["职业概述", "服务场景", "公开资料摘录"],
  };

  const sectionTitles = titles[type] || titles.city;
  return sanitizeSections(
    sectionTitles.map((title, i) => ({
      type: `section_${i}`,
      title,
      content:
        sanitizeText(fillSectionFromResearch(researchContext, title, i)) ||
        `${name}${title}（资料已检索，待 AI 整理发布）`,
    })),
  );
}

function normalizeSectionKey(title: string): string {
  return title.replace(/\s/g, "").replace(/与/g, "");
}

function ensureEntitySections(
  type: EntityType,
  sections: Array<{ type: string; title: string; content: string }>,
  researchContext?: string,
): Array<{ type: string; title: string; content: string }> {
  const required =
    type === "city"
      ? CITY_SECTION_TITLES.map((title) => ({ title, type: title }))
      : type === "person"
        ? PERSON_SECTION_TITLES.map((title) => ({ title, type: title }))
        : null;

  if (!required) return sections;

  const byKey = new Map<string, { type: string; title: string; content: string }>();
  for (const s of sections) {
    byKey.set(normalizeSectionKey(s.title), s);
  }

  return required.map(({ title, type: sectionType }, index) => {
    const existing =
      byKey.get(normalizeSectionKey(title)) ||
      [...byKey.values()].find((s) => normalizeSectionKey(s.title).includes(normalizeSectionKey(title).slice(0, 2)));

    let content = existing?.content?.trim() && !isPlaceholderContent(existing.content) && !isIncompleteContent(existing.content, 120) && !contentNeedsRewrite(existing.content, 100)
      ? existing.content
      : "";

    if (!content || isPlaceholderContent(content)) {
      content = `${title}（资料已检索，待 AI 整理后发布）`;
    }

    return { type: sectionType, title, content: sanitizeText(content) };
  }).filter((s) => s.content.length >= 30);
}

function mockEntity(
  name: string,
  type: EntityType,
  subtype?: string,
  news?: NewsItem[],
  webResults?: SearchResult[],
  researchContext?: string,
): GeneratedEntity {
  const slug = entitySlug(name);
  const fallbackSections = buildFallbackSections(name, type, researchContext);

  const templates: Record<EntityType, Partial<GeneratedEntity>> = {
    city: {
      title: `${name}城市品牌`,
      slogan: `${name}城市品牌`,
      summary: `${name}城市品牌档案（资料已检索，AI 整理待完成，请审核后发布）。`,
      sections: fallbackSections,
      tags: ["城市品牌"],
      keywords: [name, "城市"],
    },
    company: {
      title: name,
      slogan: name,
      summary: `${name}企业档案（资料已检索，AI 整理待完成，请审核后发布）。`,
      sections: fallbackSections,
      tags: ["企业品牌"],
      keywords: [name],
    },
    person: {
      title: name,
      subtitle: subtype ? PERSON_SUBTYPE_LABELS[subtype] : "企业家",
      slogan: name,
      summary: `${name}公开资料（资料已检索，AI 整理待完成，请审核后发布）。`,
      sections: fallbackSections,
      tags: ["人物IP", subtype || "entrepreneur"],
      keywords: [name],
    },
    brand: {
      title: name,
      slogan: name,
      summary: `${name}品牌档案（资料已检索，AI 整理待完成，请审核后发布）。`,
      sections: fallbackSections,
      tags: ["品牌"],
      keywords: [name],
    },
    profession: {
      title: `${name}职业群体`,
      slogan: name,
      summary: `${name}职业介绍（资料已检索，AI 整理待完成，请审核后发布）。`,
      sections: fallbackSections,
      tags: ["职业"],
      keywords: [name],
    },
  };

  const t = templates[type];
  return GeneratedEntitySchema.parse({
    slug,
    name,
    type,
    subtype,
    title: t.title || name,
    subtitle: t.subtitle,
    slogan: t.slogan || "",
    summary: t.summary || "",
    sections: t.sections || [],
    tags: t.tags || [],
    keywords: t.keywords || [],
    seo_title: `${name} - AI${type === "city" ? "城市品牌" : type === "company" ? "企业品牌" : "人物"}档案`,
    seo_description: (t.summary || "").slice(0, 150),
    theme: getDefaultEntityTheme(type, slug, name),
    relations: t.relations,
    sources: mergeSources(news, webResults, news?.map((n) => ({
      title: n.title,
      url: n.url,
      source_type: "news",
      excerpt: n.excerpt,
      confidence_score: 0.7,
    }))),
  });
}

function defaultReportRecommendations(name: string, type: EntityType): string[] {
  if (isPersonalIpReport(type)) {
    return [
      `按降龙18掌四阶段，补齐${name}从定位、内容、变现到破圈各掌的可验证素材与数据`,
      "对照手册标杆案例，逐掌标注已验证动作、缺口与 30 天可执行项",
      "建立个人内容资产库（文章/演讲/短视频/直播）并打通公域—私域—线下渠道闭环",
    ];
  }
  return [
    "系统梳理官方城市口号与传播战役演进",
    "强化终端体验与品牌资产量化",
    "对标竞品城市，突出差异化产业与文旅IP",
  ];
}

function defaultTrainingPoints(name: string, type: EntityType): string[] {
  if (isPersonalIpReport(type)) {
    return [
      "学习个人IP降龙18掌：定位→背书→内容→变现→破圈全链路复盘方法",
      `拆解${name}在媒体曝光、演讲直播、圈层资源上的可借鉴打法`,
    ];
  }
  return [
    "学习从口号—定位—传播—体验全链路复盘城市品牌",
    `拆解${name}在产业IP、美食文旅、赛会经济上的品牌打法`,
  ];
}

function getReportStepBatches(type: EntityType): Array<[number, number]> {
  const defs = getUnifiedStepDefs(type);
  const last = defs[defs.length - 1]?.step ?? 18;
  // 18 步各有独立提示词（见 reportBatchStepGuide），但一次 API 调用输出全部 steps
  return [[1, last]];
}

/** 每一步一段专用提示词，保证 18 步角度互不重复 */
function reportBatchStepGuide(type: EntityType, from: number, to: number): string {
  const lines: string[] = [];
  for (let n = from; n <= to; n++) {
    if (isPersonalIpReport(type)) {
      const def = getPersonalIpStepDef(n);
      if (!def) continue;
      lines.push(
        `=== 第${n}步 · 专用提示词 ===
【${def.xianglong}】${def.title}——${def.subtitle}
本掌聚焦：${def.hint}
落地方法（methods）：${def.methods.join("、")}
专业模型（models）：${def.models.join("、")}
手册标杆：${def.reference_cases.join("、")}
金句参考：${def.golden_quotes.join(" / ")}
要求：六段内容仅服务本掌，禁止与其他 17 掌重复粘贴。`,
      );
    } else {
      const def = getUnifiedStepDefs(type).find((d) => d.step === n);
      if (!def) continue;
      lines.push(
        `=== 第${n}步 · 专用提示词 ===
【${def.xianglong}】${def.title}——${def.subtitle}
本步聚焦：${def.hint}
标杆参考：${def.reference_cases.join("、")}
要求：六段内容仅服务本步，禁止与其他步骤重复粘贴。`,
      );
    }
  }
  return lines.join("\n\n");
}

function mockReportFromResearch(
  name: string,
  type: EntityType,
  researchContext?: string,
): GeneratedReport {
  const scores = defaultScores(type);
  const overall = computeOverallScore(scores);

  const steps = getUnifiedStepDefs(type).map((def) => {
    if (isPersonalIpReport(type)) {
      const fallback = buildPersonalIpFallbackStep(name, def.step, researchContext);
      if (fallback) return fallback as ReportStep;
    }

    const fields = [
      "learning_objectives",
      "theory_tools",
      "reference_cases",
      "brand_practice",
      "practical_training",
      "summary_lessons",
    ] as const;
    const step: ReportStep = {
      step: def.step,
      title: def.title,
      subtitle: def.subtitle,
      xianglong_punch: def.xianglong,
      xianglong_meaning: def.xianglong_meaning,
      learning_objectives: "",
      theory_tools: "",
      reference_cases: "",
      brand_practice: "",
      practical_training: "",
      summary_lessons: "",
    };
    for (const field of fields) {
      const legacy =
        field === "reference_cases"
          ? "brand_case"
          : field === "practical_training"
            ? "method_models"
            : null;
      step[field] =
        fillReportStepFromResearch(researchContext, def.title, def.step, field) ||
        (legacy
          ? fillReportStepFromResearch(researchContext, def.title, def.step, legacy)
          : "") ||
        excerptForSlot(researchContext || "", `${def.title} ${name}`, def.step, 220);
    }
    return step;
  });

  const sloganExcerpt = excerptForSlot(researchContext || "", "口号 宣传 定位 slogan", 0, 200);

  return GeneratedReportSchema.parse({
    title: reportTitleForEntity(name, type),
    summary:
      excerptForSlot(researchContext || "", `${name} 品牌 概述`, 0, 320) ||
      (isPersonalIpReport(type)
        ? `${name}个人品牌IP降龙18掌复盘（基于公开资料整理）。`
        : `${name}品牌成长18步复盘（基于公开资料整理，建议结合最新政策更新）。`),
    one_line_positioning:
      sanitizeReportMetaField(excerptForSlot(researchContext || "", "定位 口号 IP", 1, 120), 120) ||
      (isPersonalIpReport(type) ? `${name}个人品牌IP定位（见资料）` : `${name}城市品牌定位（见资料）`),
    brand_slogan_analysis:
      sanitizeReportMetaField(sloganExcerpt, 360) ||
      (isPersonalIpReport(type)
        ? "请结合其代表性标签、演讲金句与产品 slogan 补充解读。"
        : "请结合政府公开宣传语与百科条目补充口号解读。"),
    scores,
    overall_score: overall,
    steps,
    recommendations: defaultReportRecommendations(name, type),
    training_points: defaultTrainingPoints(name, type),
  });
}

function mockReport(name: string, type: EntityType, researchContext?: string): GeneratedReport {
  return mockReportFromResearch(name, type, researchContext);
}

const ENTITY_JSON_SCHEMA = `{
  "slug": "英文slug",
  "name": "名称",
  "type": "city|company|person|brand|profession",
  "subtype": "",
  "title": "标题",
  "subtitle": "副标题",
  "slogan": "一句话定位",
  "summary": "摘要250-400字",
  "sections": [{"type":"","title":"","content":""}],
  "tags": [],
  "keywords": [],
  "seo_title": "",
  "seo_description": "",
  "theme": "business_gold_dark",
  "relations": [{"target_name":"","target_type":"city|company|person|brand","relation_type":"","label":""}],
  "sources": [{"title":"","url":"","source_type":"news|wiki|official|web","excerpt":"","confidence_score":0.7}]
}`;

const ENTITY_META_SCHEMA = `{
  "slug": "英文slug",
  "name": "名称",
  "subtype": "",
  "title": "标题",
  "subtitle": "副标题",
  "slogan": "一句话定位",
  "summary": "摘要250-400字，必须完整句落",
  "tags": [],
  "keywords": [],
  "seo_title": "",
  "seo_description": "",
  "theme": "business_gold_dark",
  "relations": [{"target_name":"","target_type":"city|company|person|brand","relation_type":"","label":""}],
  "sources": [{"title":"","url":"","source_type":"news|wiki|official|web","excerpt":"","confidence_score":0.7}]
}`;

const ENTITY_SECTIONS_SCHEMA = `{
  "sections": [{"type":"","title":"","content":"200-500字完整段落"}]
}`;

const PERSON_MIN_CONTENT_CHARS = 1000;

function personContentCharTotal(
  sections: Array<{ content?: string }>,
  summary?: string,
): number {
  const sectionChars = sections.reduce((n, s) => n + (sanitizeText(s.content || "").length || 0), 0);
  return sectionChars + (sanitizeText(summary || "").length || 0);
}

async function generatePersonSectionsBatched(
  name: string,
  newsContext: string,
  extraInstruction = "",
): Promise<Array<{ type: string; title: string; content: string }>> {
  const batches: Array<(typeof PERSON_SECTION_TITLES)[number][]> = [
    [...PERSON_SECTION_TITLES.slice(0, 5)],
    [...PERSON_SECTION_TITLES.slice(5, 10)],
  ];

  const chunks: Array<{ sections?: Array<{ type: string; title: string; content: string }> }> = [];
  for (const titles of batches) {
    const chunk = await callAIJson<{ sections?: Array<{ type: string; title: string; content: string }> }>(
      `${buildPersonBioSystemPrompt("entity")}
${BASE_RULES}
只返回 JSON，格式：${ENTITY_SECTIONS_SCHEMA}`,
      `为「${name}」生成以下 ${titles.length} 个章节（title 必须与下列标题完全一致，每节 content 200-500 字，写到完整句落，严禁截断）：\n${titles.map((t, i) => `${i + 1}. ${t}`).join("\n")}${newsContext}${extraInstruction}`,
    );
    chunks.push(chunk);
  }

  return chunks.flatMap((chunk) => chunk.sections || []);
}

function parseGeneratedEntity(
  ai: Partial<GeneratedEntity> & { sections?: Array<{ type: string; title: string; content: string }> },
  name: string,
  type: EntityType,
  subtype: string | undefined,
  news?: NewsItem[],
  researchContext?: string,
  webResults?: SearchResult[],
): GeneratedEntity {
  const rawSections = (ai.sections || []).map((s) => ({
    ...s,
    content: sanitizeText(s.content),
  }));

  let summary = sanitizeText(ai.summary) || "";
  if (contentNeedsRewrite(summary, 150)) {
    summary = summary || `${name}公开品牌档案（待整理发布）`;
  }

  return GeneratedEntitySchema.parse({
    ...ai,
    name,
    type,
    slug: ai.slug || entitySlug(name),
    tags: ai.tags || [],
    keywords: ai.keywords || [],
    seo_title: ai.seo_title || `${name} - AI${type === "city" ? "城市品牌" : type === "company" ? "企业品牌" : "人物"}档案`,
    seo_description: ai.seo_description || (summary || "").slice(0, 150),
    theme: ai.theme || getDefaultEntityTheme(type, ai.slug || entitySlug(name), name),
    summary,
    sections: (() => {
      const secs = sanitizeSections(ensureEntitySections(type, rawSections, researchContext));
      if (secs.length > 0) return secs;
      return [{ type: "overview", title: `${name}概况`, content: `${name}公开资料档案（待 AI 整理发布）` }];
    })(),
    relations: ai.relations || [],
    sources: mergeSources(news, webResults, ai.sources),
  });
}

async function finalizeGeneratedEntity(
  entity: GeneratedEntity,
  name: string,
  type: EntityType,
  researchContext?: string,
): Promise<GeneratedEntity> {
  if (!researchContext?.trim()) return entity;

  const summary = await repairSummaryFromResearch(name, type, entity.summary, researchContext);
  const sections = await repairEntitySections(name, type, entity.sections, researchContext);

  return GeneratedEntitySchema.parse({
    ...entity,
    summary: summary || entity.summary,
    sections,
  });
}

export async function generateEntityContent(
  name: string,
  type: EntityType,
  subtype?: string,
  news?: NewsItem[],
  researchContext?: string,
  webResults?: SearchResult[],
  options?: { baikeOnly?: boolean; identityHint?: string },
): Promise<GeneratedEntity> {
  const baikeOnly = options?.baikeOnly === true;
  const identityHint = options?.identityHint || "";
  const identityBlock = identityHint ? `\n\n已确认人物身份（严禁写入其他同名者或无关内容）：${identityHint}` : "";
  const newsContext = buildResearchContext(baikeOnly ? [] : news, researchContext, { baikeOnly }) + identityBlock;

  try {
    if (type === "person") {
      const meta = await callAIJson<Partial<GeneratedEntity>>(
        `${buildPersonBioSystemPrompt("entity")}
生成人物档案的元信息（不含 sections，sections 另批生成）。
${BASE_RULES}
只返回 JSON，格式：${ENTITY_META_SCHEMA}`,
        `请为以下人物生成档案元信息：\n名称：${name}\n子类型：${subtype || "无"}${newsContext}`,
      );
      let sections = await generatePersonSectionsBatched(name, newsContext);
      if (personContentCharTotal(sections, meta.summary) < PERSON_MIN_CONTENT_CHARS) {
        sections = await generatePersonSectionsBatched(
          name,
          newsContext,
          `\n\n（请务必写满各节，全文合计不少于 ${PERSON_MIN_CONTENT_CHARS} 字；只写已确认身份，禁止无关内容与碎新闻拼凑）`,
        );
      }
      return finalizeGeneratedEntity(
        parseGeneratedEntity(
          { ...meta, sections, type, name },
          name,
          type,
          subtype,
          baikeOnly ? [] : news,
          researchContext,
          webResults,
        ),
        name,
        type,
        researchContext,
      );
    }

    const raw = await callAIJson<unknown>(
      `你是AI城市企业人物品牌档案生成专家。${TYPE_PROMPTS[type]}
${CONTENT_REWRITE_RULES}
${BASE_RULES}
返回 JSON 格式：${ENTITY_JSON_SCHEMA}`,
      `请为以下对象生成品牌档案：\n名称：${name}\n类型：${type}\n子类型：${subtype || "无"}${newsContext}`,
    );
    return finalizeGeneratedEntity(
      parseGeneratedEntity(raw as Partial<GeneratedEntity>, name, type, subtype, baikeOnly ? [] : news, researchContext, webResults),
      name,
      type,
      researchContext,
    );
  } catch {
    return mockEntity(name, type, subtype, baikeOnly ? [] : news, webResults, researchContext);
  }
}

const REPORT_META_SCHEMA = `{
  "title": "品牌复盘 决胜终端——{品牌名}品牌成长的18个关键步骤复盘",
  "summary": "300字执行摘要",
  "one_line_positioning": "一句话品牌定位",
  "brand_slogan_analysis": "品牌口号解读",
  "scores": { "消费者洞察力": 8 },
  "overall_score": 7.8,
  "recommendations": ["改进建议1", "改进建议2"],
  "training_points": ["学习要点1", "学习要点2"]
}`;

const REPORT_STEPS_BATCH_SCHEMA = `{
  "steps": [
    {
      "step": 1,
      "title": "消费者研究",
      "subtitle": "洞察未被满足的需求",
      "xianglong_punch": "潜龙勿用",
      "xianglong_meaning": "招式内涵",
      "learning_objectives": "120字+，3-5条目标",
      "theory_tools": "200字+，2-4个模型+大师",
      "reference_cases": "250字+，2-4个标杆案例拆解",
      "brand_practice": "350字+，本品牌具体实践",
      "practical_training": "200字+，3-5条训练动作",
      "summary_lessons": "180字+，核心逻辑/要点/误区"
    }
  ]
}`;

function computeOverallScore(scores: Record<string, number>): number {
  const values = Object.values(scores);
  if (!values.length) return 0;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

function defaultScores(type: EntityType = "company"): Record<string, number> {
  const scores: Record<string, number> = {};
  getReportScoreDimensionsForType(type).forEach((dim, i) => {
    scores[dim] = 6 + (i % 3);
  });
  return scores;
}

function normalizeScores(
  raw?: Record<string, number | null>,
  type: EntityType = "company",
): Record<string, number> {
  const base = defaultScores(type);
  if (!raw) return base;
  for (const dim of getReportScoreDimensionsForType(type)) {
    const v = raw[dim];
    if (typeof v === "number" && !Number.isNaN(v)) {
      base[dim] = Math.min(10, Math.max(0, v));
    }
  }
  return base;
}

function normalizeReportStep(
  def: UnifiedStepDef,
  existing: Partial<ReportStep> | undefined,
  name: string,
  researchContext?: string,
): ReportStep {
  const isMockTemplate = isPlaceholderContent(
    coerceText(existing?.reference_cases) || coerceText(existing?.brand_case),
  );

  const pick = (
    field:
      | "learning_objectives"
      | "theory_tools"
      | "reference_cases"
      | "brand_practice"
      | "practical_training"
      | "summary_lessons",
    fallbackField:
      | "learning_objectives"
      | "theory_tools"
      | "reference_cases"
      | "brand_practice"
      | "practical_training"
      | "summary_lessons"
      | "method_models"
      | "brand_case",
  ) => {
    const val = coerceText(existing?.[field]);
    if (val.trim() && !isPlaceholderContent(val)) return val;
    const legacyRaw =
      field === "reference_cases"
        ? existing?.brand_case
        : field === "practical_training"
          ? existing?.method_models
          : undefined;
    const legacy = coerceText(legacyRaw);
    if (legacy.trim() && !isPlaceholderContent(legacy)) return legacy;
    const fromResearch = fillReportStepFromResearch(
      researchContext,
      def.title,
      def.step,
      fallbackField,
    );
    if (fromResearch) return sanitizeReportField(fromResearch);
    return "";
  };

  const rawStep = {
    step: def.step,
    title: def.title,
    subtitle: def.subtitle,
    xianglong_punch: existing?.xianglong_punch || def.xianglong,
    xianglong_meaning: existing?.xianglong_meaning || def.xianglong_meaning,
    learning_objectives: pick("learning_objectives", "learning_objectives"),
    theory_tools: pick("theory_tools", "theory_tools"),
    reference_cases: isMockTemplate
      ? pick("reference_cases", "brand_case")
      : pick("reference_cases", "reference_cases"),
    brand_practice: pick("brand_practice", "brand_practice"),
    practical_training: pick("practical_training", "method_models"),
    summary_lessons: pick("summary_lessons", "summary_lessons"),
  };

  const sanitized = sanitizeReportStep({
    learning_objectives: rawStep.learning_objectives,
    theory_tools: rawStep.theory_tools,
    reference_cases: rawStep.reference_cases,
    brand_practice: rawStep.brand_practice,
    practical_training: rawStep.practical_training,
    summary_lessons: rawStep.summary_lessons,
  });
  return {
    ...rawStep,
    learning_objectives: sanitized.learning_objectives || rawStep.learning_objectives,
    theory_tools: sanitized.theory_tools || rawStep.theory_tools,
    reference_cases: sanitized.reference_cases || rawStep.reference_cases,
    brand_practice: sanitized.brand_practice || rawStep.brand_practice,
    practical_training: sanitized.practical_training || rawStep.practical_training,
    summary_lessons: sanitized.summary_lessons || rawStep.summary_lessons,
  };
}

function ensureReportSteps(
  aiSteps: ReportStep[],
  name: string,
  type: EntityType,
  researchContext?: string,
): ReportStep[] {
  const byStep = new Map<number, Partial<ReportStep>>();
  for (const s of aiSteps) {
    if (s?.step) byStep.set(s.step, s);
  }

  return getUnifiedStepDefs(type).map((def) => {
    const step = normalizeReportStep(def, byStep.get(def.step), name, researchContext);
    const fields = [
      "learning_objectives",
      "theory_tools",
      "reference_cases",
      "brand_practice",
      "practical_training",
      "summary_lessons",
    ] as const;
    const filled: ReportStep = { ...step };
    for (const field of fields) {
      if (!sanitizeText(filled[field])) {
        if (isPersonalIpReport(type)) {
          filled[field] =
            buildPersonalIpFallbackField(name, def.step, field, researchContext) ||
            excerptForSlot(researchContext || "", `${def.title} ${name}`, def.step + field.length, 200);
        } else {
          filled[field] =
            fillReportStepFromResearch(researchContext, def.title, def.step, field) ||
            excerptForSlot(researchContext || "", `${def.title} ${name}`, def.step + field.length, 200);
        }
      }
      filled[field] = sanitizeReportField(filled[field]) || sanitizeText(filled[field]);
    }
    return filled;
  });
}

async function ensureReportStepsWithRepair(
  aiSteps: ReportStep[],
  name: string,
  type: EntityType,
  researchContext: string,
): Promise<ReportStep[]> {
  let steps = ensureReportSteps(aiSteps, name, type, researchContext);
  const thin = steps.filter((s) => isThinReportStep(s, type));
  if (thin.length === 0) return steps;

  const repairLimit = isPersonalIpReport(type) ? Math.min(thin.length, 12) : Math.min(thin.length, 6);
  for (let i = 0; i < repairLimit; i++) {
    const step = thin[i];
    const def = getUnifiedStepDefs(type).find((d) => d.step === step.step);
    if (!def) continue;
    try {
      const repaired = await repairSingleReportStep(name, type, def, step, researchContext);
      steps = steps.map((s) => (s.step === repaired.step ? repaired : s));
    } catch (error) {
      console.warn(`[report] repair step ${step.step} failed:`, error);
    }
  }

  return ensureReportSteps(steps, name, type, researchContext);
}

function isThinReportStep(step: ReportStep, type: EntityType): boolean {
  const fields = getReportSectionKeysForType(type).map((s) => s.key);
  let filled = 0;
  for (const key of fields) {
    const val = sanitizeText(String(step[key as keyof ReportStep] || ""));
    if (val.length >= 80) filled++;
  }
  return filled < 4;
}

async function buildReportResearchContext(
  name: string,
  type: EntityType,
  profileSummary?: string,
  news?: NewsItem[],
  researchContext?: string,
  identityHint?: string,
): Promise<string> {
  const parts: string[] = [];

  if (identityHint?.trim()) {
    parts.push(`【已确认人物身份】\n${identityHint.trim()}（报告正文严禁写入其他同名者或无关内容）`);
  }

  if (profileSummary?.trim()) parts.push(`【档案摘要】\n${profileSummary.trim()}`);

  if (researchContext?.trim()) {
    parts.push(researchContext.trim());
  } else if (type !== "city") {
    const research = await gatherEntityResearch(name, type, { fetchNews: true });
    if (research.contextText?.trim()) parts.push(research.contextText.trim());
  }

  if (type === "city") {
    parts.push(CITY_BRAND_RESEARCH_HINTS);
    parts.push(await gatherCityBrandResearchContext(name));
  }

  if (news?.length) {
    parts.push(
      `【相关新闻】\n${news
        .slice(0, 10)
        .map((n) => `- ${n.title}${n.excerpt ? `：${n.excerpt.slice(0, 120)}` : ""}`)
        .join("\n")}`,
    );
  }

  return parts
    .join("\n\n")
    .split("\n\n")
    .map((block) => cleanEncyclopediaText(block, "web"))
    .filter((b) => b.length >= 20)
    .join("\n\n")
    .slice(0, 32000);
}

async function repairSingleReportStep(
  name: string,
  type: EntityType,
  def: UnifiedStepDef,
  existing: ReportStep,
  context: string,
): Promise<ReportStep> {
  const systemPrompt = getReportSystemPromptForType(type);
  const methodFlow = isPersonalIpReport(type) ? "" : BRAND_METHOD_CANONICAL_FLOW;
  const raw = await callAIJson<{ step?: ReportStep }>(
    `${systemPrompt}
${methodFlow}

只返回 JSON：{ "step": { "step": ${def.step}, "title": "${def.title}", "subtitle": "${def.subtitle}", "xianglong_punch": "${def.xianglong}", "learning_objectives": "...", "theory_tools": "...", "reference_cases": "...", "brand_practice": "...", "practical_training": "...", "summary_lessons": "..." } }

严禁套话。每一步六段合计不少于 1000 字。${isPersonalIpReport(type) ? "针对该人物公开资料撰写个人IP复盘。" : "城市类必须引用资料中的口号、政策名、活动名。"}
${EVIDENCE_REPORT_RULES}`,
    `重写「${name}」（${type}）第 ${def.step} 步「${def.title}」的完整六段式复盘。

资料：
${context.slice(0, 14000)}

当前草稿（质量不足，请全部重写）：
${JSON.stringify(existing).slice(0, 800)}`,
  );

  const patched = raw.step;
  if (!patched?.step) return existing;

  return normalizeReportStep(def, patched, name, context);
}

async function generateReportStepsBatch(
  name: string,
  type: EntityType,
  context: string,
  from: number,
  to: number,
): Promise<ReportStep[]> {
  const defs = getUnifiedStepDefs(type).filter((s) => s.step >= from && s.step <= to);
  const stepCount = defs.length;
  const minCharsPerStep = stepCount >= 15 ? 450 : stepCount >= 6 ? 700 : 1200;
  const maxTokens = stepCount >= 15 ? 16384 : stepCount >= 6 ? 12288 : 8192;
  const cityExtra =
    type === "city" && from <= 9 && to >= 7
      ? "\n第7步必须写清城市定位演进；第8步写城市命名/别称（蓉城、天府之国等）；第9步必须逐条列出至少3条官方或传播口号原文并解读。"
      : "";
  const personalExtra = isPersonalIpReport(type)
    ? `\n人物类使用降龙18掌个人IP框架。六段字段含义：
- learning_objectives = 已有品牌资产（从证据中提取${name}已有身份、经历、文章、演讲、项目、案例）
- theory_tools = 品牌判断（用本掌框架判断${name}的优势、定位、内容资产、信任背书或传播结构）
- reference_cases = 对标启发（只写可借鉴方向和差异，禁止照抄手册案例）
- brand_practice = 本人物现状复盘（必须写${name}自身，禁止只写百科公司简介）
- practical_training = 优化建议（给出${name}下一步可执行动作，不编造未发生事实）
- summary_lessons = 本掌结论与风险提醒
每一步六段内容必须互不重复；禁止把同一段百科粘贴到多个字段或多个步骤。`
    : "";

  const systemPrompt = getReportSystemPromptForType(type);
  const methodFlow = isPersonalIpReport(type) ? "" : BRAND_METHOD_CANONICAL_FLOW;

  const raw = await callAIJson<{ steps?: ReportStep[] }>(
    `${systemPrompt}
${methodFlow}

只返回 JSON，格式：
${REPORT_STEPS_BATCH_SCHEMA}

严禁套话（禁止整段只有「运用PEST/波特五力/SWOT…分析${name}在某某环节的策略选择」）。
必须写${name}的真实经历、作品、事件、定位、数据；可摘录资料原文。
${EVIDENCE_REPORT_RULES}
${type === "city" ? CITY_BRAND_RESEARCH_HINTS : ""}${personalExtra}`,
    `为「${name}」（${type}）一次性撰写第 ${from}-${to} 步（共 ${stepCount} 步）完整复盘。

资料（务必引用）：
${context.slice(0, 14000) || "公开资料有限，谨慎分析"}

以下每一步有独立提示词，请严格按步执行，steps 数组必须包含 ${stepCount} 个对象（step 从 ${from} 到 ${to}）：
${reportBatchStepGuide(type, from, to)}

每步六段式降龙复盘，每步合计不少于 ${minCharsPerStep} 字（精炼具体，禁止空洞套话）。
${cityExtra}

${isPersonalIpReport(type) ? "参照同领域人物或同类型IP做对标，brand_practice 必须写该人物自身公开资料，并给出差异化结论。" : type === "city" ? "城市类只能对标同能级、同区域或同产业定位城市；reference_cases 写城市政策、公共传播、文旅活动、产业名片和地标体验，禁止把企业案例当成城市案例主体。" : "企业/品牌类必须选择同行业、同客群或同价格带品牌做对标；reference_cases 要说明相关性、相似点、差异点、动作结果和本品牌结论。"}`,
    { maxTokens },
  );

  const stepDefs = getUnifiedStepDefs(type);
  const steps = (raw.steps || []).map((s) => {
    const def = stepDefs.find((d) => d.step === s.step);
    return def ? normalizeReportStep(def, s, name, context) : s;
  });

  return steps;
}

async function generateReportMeta(
  name: string,
  type: EntityType,
  context: string,
): Promise<Partial<GeneratedReport>> {
  const systemPrompt = getReportSystemPromptForType(type);
  const methodFlow = isPersonalIpReport(type) ? "" : BRAND_METHOD_CANONICAL_FLOW;
  return callAIJson<Partial<GeneratedReport>>(
    `${systemPrompt}
${methodFlow}

只返回 JSON（不要 steps），格式：
${REPORT_META_SCHEMA}
${EVIDENCE_REPORT_RULES}`,
    `为「${name}」（${type}）生成${isPersonalIpReport(type) ? "个人品牌IP降龙18掌" : "品牌复盘"}报告的摘要与评分部分。

${type === "city" ? "brand_slogan_analysis 必须列举资料中的城市宣传口号原文并解读（至少2条）。one_line_positioning 要体现官方定位表述。" : ""}
${isPersonalIpReport(type) ? "one_line_positioning 写该人物一句话IP定位；brand_slogan_analysis 解读其代表性口号/标签/slogan（如有）。" : ""}

资料：
${context.slice(0, 12000) || "公开资料有限"}`,
  );
}

export async function generateReportContent(
  name: string,
  type: EntityType,
  profileSummary?: string,
  news?: NewsItem[],
  researchContext?: string,
  options?: { identityHint?: string; onProgress?: (message: string) => void },
): Promise<GeneratedReport> {
  const context = await buildReportResearchContext(
    name,
    type,
    profileSummary,
    news,
    researchContext,
    options?.identityHint,
  );

  try {
    options?.onProgress?.("正在撰写报告摘要与综合评分（约 30 秒）…");
    const meta = await generateReportMeta(name, type, context);
    options?.onProgress?.(
      isPersonalIpReport(type)
        ? "正在一次性生成 18 步降龙复盘（约 3–5 分钟，请耐心等待）…"
        : "正在一次性生成 18 步品牌复盘（约 3–5 分钟）…",
    );
    const batches = getReportStepBatches(type);
    const stepChunks: ReportStep[] = [];
    for (const [from, to] of batches) {
      const chunk = await generateReportStepsBatch(name, type, context, from, to);
      stepChunks.push(...chunk);
    }
    const steps = await ensureReportStepsWithRepair(stepChunks, name, type, context);
    let segments: Awaited<ReturnType<typeof generateReportSegments>>["segments"] = [];
    let segment_dimensions: Awaited<ReturnType<typeof generateReportSegments>>["segment_dimensions"] = {
      cities: [],
      industries: [],
    };
    if (!isPersonalIpReport(type)) {
      try {
        const segResult = await generateReportSegments(name, type, context);
        segments = segResult.segments;
        segment_dimensions = segResult.segment_dimensions;
      } catch (segError) {
        console.warn("[generateReportContent] 分维度切片生成失败，跳过 segments:", segError);
      }
    }
    const scores = normalizeScores(meta.scores as Record<string, number | null> | undefined, type);

    return GeneratedReportSchema.parse({
      title: meta.title || reportTitleForEntity(name, type),
      summary:
        sanitizeReportMetaField(meta.summary, 480) ||
        firstPublishableExcerpt(context, 400) ||
        (isPersonalIpReport(type)
          ? `${name}个人品牌IP降龙18掌复盘报告。`
          : `${name}品牌成长18步复盘报告。`),
      one_line_positioning:
        sanitizeReportMetaField(meta.one_line_positioning, 120) ||
        firstPublishableExcerpt(context, 100) ||
        `${name}——基于公开资料的品牌定位复盘`,
      brand_slogan_analysis:
        sanitizeReportMetaField(meta.brand_slogan_analysis, 360) ||
        firstPublishableExcerpt(context, 280) ||
        (isPersonalIpReport(type)
          ? "请结合其代表性标签、演讲金句与产品 slogan 补充解读。"
          : "请结合企业公开宣传语与品牌主张补充解读。"),
      scores,
      overall_score: meta.overall_score ?? computeOverallScore(scores),
      steps,
      segments: segments.length ? segments : undefined,
      segment_dimensions:
        segment_dimensions.cities.length || segment_dimensions.industries.length
          ? segment_dimensions
          : undefined,
      recommendations: meta.recommendations?.length
        ? meta.recommendations
        : defaultReportRecommendations(name, type),
      training_points: meta.training_points?.length
        ? meta.training_points
        : defaultTrainingPoints(name, type),
    });
  } catch (error) {
    console.error("[generateReportContent] AI 生成失败，降级为资料摘录:", error);
    return mockReport(name, type, context);
  }
}
