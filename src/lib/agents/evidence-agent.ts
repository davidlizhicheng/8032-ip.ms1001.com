import type { EvidencePack, EvidenceSource, PipelineContext, ResearchPlan } from "@/lib/agents/types";
import type { RawResearchResult } from "@/lib/agents/research-agent";
import { createStreamEmitter } from "@/lib/agents/stream-events";
import { cleanEncyclopediaText } from "@/lib/content/source-clean";
import type { EnrichedSource } from "@/lib/search/baike-fetcher";

const MIN_HIGH_QUALITY = 5;
const MIN_CHARS = 300;

function hostAuthority(url: string): number {
  try {
    const h = new URL(url).hostname.replace(/^www\./, "");
    if (h.endsWith(".gov.cn")) return 0.95;
    if (h.includes("people.com.cn") || h.includes("xinhuanet.com")) return 0.9;
    if (h.includes("baike.baidu.com") || h.includes("wikipedia.org")) return 0.85;
    if (/163|sohu|sina|ifeng|thepaper|caixin|cctv/.test(h)) return 0.78;
    return 0.55;
  } catch {
    return 0.4;
  }
}

function inferTags(text: string, entityType: string): string[] {
  const tags: string[] = [];
  const rules: Array<[RegExp, string]> =
    entityType === "city"
      ? [
          [/口号|定位|slogan/i, "城市口号"],
          [/文旅|旅游|景点|文化/i, "文旅"],
          [/产业|经济|企业|制造/i, "产业定位"],
          [/传播|营销|案例|宣传/i, "传播案例"],
          [/公园城市|赛事|美食/i, "城市IP"],
        ]
      : entityType === "person"
        ? [
            [/职务|任职|书记|总经理|董事/i, "职务/经历"],
            [/创业|公司|企业/i, "创业/企业"],
            [/公益|基金|慈善/i, "公益"],
            [/演讲|访谈|专访/i, "访谈"],
            [/著作|出书|写书/i, "著作"],
            [/成就|荣誉|奖项/i, "成就/案例"],
          ]
        : [
            [/发展|历程|创立/i, "发展历程"],
            [/品牌|定位|口号/i, "品牌定位"],
            [/产品|业务|服务/i, "代表产品"],
            [/研发|技术|创新/i, "研发"],
          ];

  for (const [re, tag] of rules) {
    if (re.test(text)) tags.push(tag);
  }
  return tags;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractChineseNames(text: string): string[] {
  return Array.from(new Set(text.match(/[\u4e00-\u9fa5]{2,4}/g) || []));
}

function hasSameNamePollution(text: string, entityName: string, identityHint?: string): boolean {
  if (!/[\u4e00-\u9fa5]{2,4}/.test(entityName)) return false;
  if (!text.includes(entityName)) return true;

  const prefix = entityName.length >= 3 ? entityName.slice(0, 2) : entityName;
  const neighborNames = extractChineseNames(text).filter((candidate) => {
    if (candidate === entityName) return false;
    if (candidate.length !== entityName.length) return false;
    return candidate.startsWith(prefix);
  });

  if (!neighborNames.length) return false;
  if (identityHint && identityHint.length >= 2 && text.includes(identityHint)) return false;

  const exactHits = (text.match(new RegExp(escapeRegExp(entityName), "g")) || []).length;
  return exactHits < neighborNames.length;
}

function mapUsableSteps(text: string, tags: string[], entityType: string): string[] {
  if (entityType !== "person") return tags;
  const steps = new Set<string>();
  const rules: Array<[RegExp, string]> = [
    [/定位|标签|身份|职务|任职|书记|董事|创始|创办|企业家|公益人/i, "第1-3步：定位、标签、背书"],
    [/经历|履历|早年|毕业|大学|工作|创业|转型/i, "第4-6步：经历线、故事线、信任线"],
    [/演讲|访谈|专访|文章|著作|出版|观点|金句/i, "第7-10步：内容资产、观点表达"],
    [/公益|基金|慈善|扶贫|乡村|项目|案例|行动/i, "第11-14步：代表案例、社会影响"],
    [/荣誉|奖项|影响力|媒体|报道|传播|论坛|活动/i, "第15-18步：破圈传播、长期资产"],
  ];
  for (const [re, label] of rules) {
    if (re.test(text) || tags.some((tag) => re.test(tag))) steps.add(label);
  }
  return Array.from(steps);
}

function relevanceScore(text: string, name: string, identityHint?: string): number {
  let score = 0;
  if (text.includes(name)) score += 0.5;
  if (identityHint) {
    for (const part of identityHint.split(/[·，,、]/).filter((p) => p.length >= 2)) {
      if (text.includes(part.trim())) score += 0.15;
    }
  }
  return Math.min(1, score);
}

function sourceToEvidence(src: EnrichedSource, entityName: string, entityType: string, identityHint?: string): EvidenceSource | null {
  const raw = src.fullText || src.snippet || "";
  const kind = src.sourceType === "wiki" ? "wiki" : src.sourceType === "baike" ? "baike" : src.sourceType === "gov" ? "gov" : "web";
  const text = cleanEncyclopediaText(raw, kind === "gov" ? "web" : kind);
  const gateText = `${src.title}\n${text}`;
  if (text.length < 80) return null;

  const auth = hostAuthority(src.url);
  const rel = relevanceScore(gateText, entityName, identityHint);
  if (entityType === "person" && rel <= 0) return null;
  if (entityType === "person" && hasSameNamePollution(gateText, entityName, identityHint)) return null;

  const lengthFactor = text.length >= MIN_CHARS ? 1 : text.length / MIN_CHARS;
  const qualityScore = Math.min(1, auth * 0.5 + rel * 0.35 + lengthFactor * 0.15);
  const tags = inferTags(text, entityType);
  const usableSteps = mapUsableSteps(text, tags, entityType);
  const gateNotes = [
    `identity:${entityType === "person" ? "exact-name-pass" : "entity-pass"}`,
    `source:${kind}`,
    usableSteps.length ? `steps:${usableSteps.length}` : "steps:general",
  ];

  return {
    id: `${src.url}-${text.length}`,
    title: src.title,
    url: src.url,
    sourceType: kind === "baike" ? "baike" : kind === "wiki" ? "wiki" : kind === "gov" ? "gov" : "web",
    text: text.slice(0, 30000),
    charCount: text.length,
    qualityScore,
    relevanceScore: rel,
    tags,
    usableSteps,
    gateNotes,
    fetchedAt: new Date().toISOString(),
  };
}

function dedupeSources(sources: EvidenceSource[]): EvidenceSource[] {
  const seen = new Set<string>();
  return sources.filter((s) => {
    const key = s.url.split("?")[0];
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildContextText(sources: EvidenceSource[]): string {
  return sources
    .sort((a, b) => b.qualityScore - a.qualityScore)
    .slice(0, 12)
    .map(
      (s, i) =>
        `[证据 ${i + 1}] ${s.title}\n来源：${s.sourceType}（${s.url}）\n标签：${s.tags.join("、") || "综合"}\n可用于：${s.usableSteps?.join("；") || "基础事实与背景判断"}\n资料闸门：${s.gateNotes?.join("；") || "已通过"}\n质量：${s.qualityScore.toFixed(2)}\n正文：\n${s.text.slice(0, 5000)}`,
    )
    .join("\n\n");
}

function detectGaps(plan: ResearchPlan, sources: EvidenceSource[]): string[] {
  const covered = new Set(sources.flatMap((s) => s.tags));
  return plan.requiredTopics.filter((t) => !covered.has(t));
}

/** 证据整理 Agent：打分、去重、打标签 → Evidence Pack */
export function runEvidenceAgent(
  lock: { name: string; type: string; identityHint?: string },
  raw: RawResearchResult,
  ctx: PipelineContext = {},
): EvidencePack {
  const stream = createStreamEmitter(ctx);
  stream.status("正在整理证据包…", "evidence");

  const allSources: EnrichedSource[] = [
    ...raw.bundle.baikeEntries,
    ...(raw.bundle.wiki ? [raw.bundle.wiki] : []),
    ...raw.bundle.webCrawlPages,
    ...raw.bundle.pageExcerpts,
    ...raw.deepPages,
    ...raw.bundle.news.map((n) => ({
      title: n.title,
      url: n.url,
      snippet: n.excerpt || n.title,
      fullText: n.excerpt,
      source: n.source || "news",
      provider: "news",
      sourceType: "web" as const,
      confidenceScore: 0.7,
    })),
  ];

  const evidence = dedupeSources(
    allSources
      .map((s) => sourceToEvidence(s, lock.name, lock.type, lock.identityHint))
      .filter(Boolean) as EvidenceSource[],
  ).sort((a, b) => b.qualityScore - a.qualityScore);

  const highQualityCount = evidence.filter((s) => s.qualityScore >= 0.6).length;
  const gaps = detectGaps(raw.plan, evidence);
  const readyForWriting = highQualityCount >= MIN_HIGH_QUALITY;

  for (const s of evidence.slice(0, 8)) {
    stream.source({
      title: s.title,
      url: s.url,
      score: s.qualityScore,
      tags: s.tags,
      charCount: s.charCount,
    });
  }

  stream.status(
    `证据包就绪：${evidence.length} 条来源，${highQualityCount} 条高质量${readyForWriting ? "" : `（不足 ${MIN_HIGH_QUALITY} 条，写作将受限）`}`,
    "evidence",
    { gaps, highQualityCount },
  );

  if (gaps.length) {
    stream.status(`资料缺口：${gaps.join("、")}`, "gap_check", { gaps });
  }

  return {
    entityName: lock.name,
    entityType: lock.type as EvidencePack["entityType"],
    identityHint: lock.identityHint,
    sources: evidence,
    highQualityCount,
    contextText: buildContextText(evidence),
    gaps,
    readyForWriting,
  };
}

export { MIN_HIGH_QUALITY as EVIDENCE_MIN_SOURCES };
