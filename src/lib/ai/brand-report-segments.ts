import { callAIJson } from "@/lib/ai/client";
import { BRAND_REPORT_SYSTEM_PROMPT, BRAND_REVIEW_18_STEPS } from "@/lib/ai/brand-report-template";
import type { EntityType, ReportSegment, ReportStep } from "@/lib/schemas/entity";

const SEGMENT_TYPES: EntityType[] = ["company", "person", "brand", "profession"];

export function shouldGenerateReportSegments(type: EntityType): boolean {
  return SEGMENT_TYPES.includes(type);
}

type SegmentPlan = {
  cities: string[];
  industries: string[];
  segments: Array<{
    id: string;
    label: string;
    dimension: "city" | "industry" | "city_industry";
    city?: string;
    industry?: string;
  }>;
};

async function planReportSegments(
  name: string,
  type: EntityType,
  context: string,
): Promise<SegmentPlan> {
  const raw = await callAIJson<{
    cities?: string[];
    industries?: string[];
    segments?: SegmentPlan["segments"];
  }>(
    `${BRAND_REPORT_SYSTEM_PROMPT}

只返回 JSON：
{
  "cities": ["深圳", "上海"],
  "industries": ["新能源", "消费电子"],
  "segments": [
    { "id": "city-shenzhen", "label": "深圳市场视角", "dimension": "city", "city": "深圳" },
    { "id": "industry-ev", "label": "新能源行业视角", "dimension": "industry", "industry": "新能源" },
    { "id": "city-shenzhen-industry-ev", "label": "深圳×新能源", "dimension": "city_industry", "city": "深圳", "industry": "新能源" }
  ]
}

规则：
- 企业/老板/职业经理人：从资料推断最多 3 个核心城市、3 个核心行业
- segments 最多 6 条：优先 2 个 city-only、2 个 industry-only、最多 2 个 city×industry 组合
- 城市类实体返回 cities=[], industries=[], segments=[]`,
    `为「${name}」（${type}）规划分城市/分行业复盘维度。

资料：
${context.slice(0, 12000)}`,
  );

  const cities = (raw.cities || []).slice(0, 3);
  const industries = (raw.industries || []).slice(0, 3);
  let segments = raw.segments || [];

  if (!segments.length && (cities.length || industries.length)) {
    segments = [
      ...cities.slice(0, 2).map((city) => ({
        id: `city-${city}`,
        label: `${city}市场视角`,
        dimension: "city" as const,
        city,
      })),
      ...industries.slice(0, 2).map((industry) => ({
        id: `industry-${industry}`,
        label: `${industry}行业视角`,
        dimension: "industry" as const,
        industry,
      })),
    ];
    if (cities[0] && industries[0]) {
      segments.push({
        id: `city-${cities[0]}-industry-${industries[0]}`,
        label: `${cities[0]}×${industries[0]}`,
        dimension: "city_industry",
        city: cities[0],
        industry: industries[0],
      });
    }
  }

  return {
    cities,
    industries,
    segments: segments.slice(0, 6),
  };
}

async function generateOneSegment(
  name: string,
  type: EntityType,
  context: string,
  segment: SegmentPlan["segments"][number],
): Promise<ReportSegment> {
  const lens =
    segment.dimension === "city"
      ? `聚焦「${segment.city}」区域市场：消费者、竞品、渠道、传播、终端体验均从该城市视角展开。`
      : segment.dimension === "industry"
        ? `聚焦「${segment.industry}」行业赛道：对标同行业品牌，分析行业趋势与差异化。`
        : `聚焦「${segment.city}×${segment.industry}」交叉场景：该城市在该行业中的品牌打法。`;

  const raw = await callAIJson<{
    summary?: string;
    step_insights?: Array<{ step: number; title: string; insight: string }>;
    deep_steps?: ReportStep[];
  }>(
    `${BRAND_REPORT_SYSTEM_PROMPT}

只返回 JSON：
{
  "summary": "300-500字该维度下的执行摘要",
  "step_insights": [
    { "step": 1, "title": "消费者研究", "insight": "150-250字，${segment.label}视角下的本步洞察" }
  ],
  "deep_steps": [
    {
      "step": 7,
      "title": "品牌定位",
      "learning_objectives": "...",
      "theory_tools": "...",
      "reference_cases": "...",
      "brand_practice": "...",
      "practical_training": "...",
      "summary_lessons": "..."
    }
  ]
}

deep_steps 必须包含第 1、7、12、13 步的完整六段式（每段 150-300 字）。
step_insights 必须覆盖全部 18 步。`,
    `为「${name}」（${type}）撰写分维度品牌复盘：${segment.label}

${lens}

资料：
${context.slice(0, 14000)}

18步清单：
${BRAND_REVIEW_18_STEPS.map((s) => `${s.step}. ${s.title}`).join("\n")}`,
  );

  const stepInsights = (raw.step_insights || [])
    .slice(0, 18)
    .map((s) => {
      const def = BRAND_REVIEW_18_STEPS.find((d) => d.step === s.step);
      return {
        step: s.step,
        title: s.title || def?.title || `第${s.step}步`,
        insight:
          (typeof s.insight === "string" && s.insight.trim()) ||
          `（${segment.label}）${def?.subtitle || ""}：结合公开资料，从${segment.label}视角审视${name}在「${def?.title || `第${s.step}步`}」环节的布局与可优化空间。`,
      };
    });
  for (const def of BRAND_REVIEW_18_STEPS) {
    if (!stepInsights.some((s) => s.step === def.step)) {
      stepInsights.push({
        step: def.step,
        title: def.title,
        insight: `（${segment.label}）${def.subtitle}：结合公开资料，从${segment.label}视角审视${name}在「${def.title}」环节的布局与可优化空间。`,
      });
    }
  }
  stepInsights.sort((a, b) => a.step - b.step);

  return {
    id: segment.id,
    label: segment.label,
    dimension: segment.dimension,
    city: segment.city,
    industry: segment.industry,
    summary: raw.summary || `${name}在${segment.label}下的18步品牌复盘摘要。`,
    step_insights: stepInsights,
    deep_steps: raw.deep_steps,
  };
}

export async function generateReportSegments(
  name: string,
  type: EntityType,
  context: string,
): Promise<{ segments: ReportSegment[]; segment_dimensions: { cities: string[]; industries: string[] } }> {
  if (!shouldGenerateReportSegments(type)) {
    return { segments: [], segment_dimensions: { cities: [], industries: [] } };
  }

  try {
    const plan = await planReportSegments(name, type, context);
    if (!plan.segments.length) {
      return { segments: [], segment_dimensions: { cities: plan.cities, industries: plan.industries } };
    }

    const segments: ReportSegment[] = [];
    for (const seg of plan.segments) {
      try {
        segments.push(await generateOneSegment(name, type, context, seg));
      } catch (error) {
        console.warn(`[report-segments] ${seg.id} failed:`, error);
      }
    }

    return {
      segments,
      segment_dimensions: { cities: plan.cities, industries: plan.industries },
    };
  } catch (error) {
    console.warn("[report-segments] planning failed:", error);
    return { segments: [], segment_dimensions: { cities: [], industries: [] } };
  }
}
