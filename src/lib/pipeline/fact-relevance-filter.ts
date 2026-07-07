import type { EnrichedSource } from "@/lib/search/baike-fetcher";
import type { SearchResult } from "@/lib/search/web-search";
import type { FactCategory, FactSnippet } from "@/lib/pipeline/types";

/** 与人物主题无关、应丢弃的门户/财经碎新闻模式 */
const JUNK_PATTERNS = [
  /身家|股价|涨停|跌停|市值|富豪榜|万亿|亿美|港元|A股|港股/,
  /快讯|滚动|标签页|自媒体|转述|评论专区/,
  /待抓取|公开检索|资料不足|暂无收录/,
  /太空经济|市场规模|行业分析报告(?!.*(?:公司|集团|创办))/,
  /姓氏.{0,6}李|李姓发展|源于嬴姓|最早见于甲骨文/,
  /李大钊|李达，中国|李耳，属于以官职/,
];

const CATEGORY_KEYWORDS: Record<FactCategory, RegExp[]> = {
  bio: [/出生|生于|籍贯|国籍|早年|家庭/],
  education: [/大学|学院|毕业|学位|博士|硕士|学士|留学/],
  career: [/任职|担任|职务|CEO|董事长|总裁|创始人|总经理|教授|律师/],
  achievement: [/成就|获奖|荣誉|代表作|发明|出版|专利/],
  organization: [/公司|集团|企业|机构|基金会|协会|研究院/],
  honor: [/称号|勋章|表彰|入选|榜单|杰出/],
  brand: [/品牌|口号|slogan|定位|理念|愿景/],
  other: [],
};

function scoreParagraph(text: string, name: string, identityHint: string): number {
  let score = 0;
  const hay = `${text} ${identityHint}`;
  if (text.includes(name)) score += 4;
  else score -= 3;
  if (identityHint) {
    for (const part of identityHint.split(/[·，,、]/).filter(Boolean)) {
      const p = part.trim();
      if (p.length >= 2 && hay.includes(p)) score += 2;
    }
  }
  for (const patterns of Object.values(CATEGORY_KEYWORDS)) {
    if (patterns.some((p) => p.test(text))) score += 1;
  }
  if (text.length >= 80) score += 1;
  if (text.length >= 200) score += 1;
  for (const junk of JUNK_PATTERNS) {
    if (junk.test(text)) score -= 8;
  }
  return score;
}

function classifyParagraph(text: string): FactCategory {
  for (const [cat, patterns] of Object.entries(CATEGORY_KEYWORDS) as [FactCategory, RegExp[]][]) {
    if (cat === "other") continue;
    if (patterns.some((p) => p.test(text))) return cat;
  }
  return "other";
}

function splitParagraphs(fullText: string): string[] {
  return fullText
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length >= 40);
}

function entryToSnippets(
  entry: EnrichedSource,
  name: string,
  identityHint: string,
  sourceType: FactSnippet["sourceType"],
): FactSnippet[] {
  const body = entry.fullText || entry.snippet || "";
  const snippets: FactSnippet[] = [];
  for (const para of splitParagraphs(body)) {
    const relevanceScore = scoreParagraph(para, name, identityHint);
    if (relevanceScore < 1) continue;
    snippets.push({
      sourceType,
      title: entry.title,
      url: entry.url,
      category: classifyParagraph(para),
      excerpt: para.slice(0, 1200),
      relevanceScore,
    });
  }
  if (snippets.length === 0 && body.length >= 60) {
    const score = scoreParagraph(body.slice(0, 800), name, identityHint);
    if (score >= 0) {
      snippets.push({
        sourceType,
        title: entry.title,
        url: entry.url,
        category: "bio",
        excerpt: body.slice(0, 2000),
        relevanceScore: Math.max(score, 1),
      });
    }
  }
  return snippets;
}

export function filterRelevantFacts(options: {
  name: string;
  identityHint: string;
  baikeEntries: EnrichedSource[];
  wiki: EnrichedSource | null;
  webCrawlPages?: EnrichedSource[];
  webResults?: SearchResult[];
  excludeKeywords?: string[];
  minScore?: number;
}): FactSnippet[] {
  const minScore = options.minScore ?? 1;
  const exclude = (options.excludeKeywords || []).map((k) => k.toLowerCase());

  const raw: FactSnippet[] = [];

  for (const entry of options.webCrawlPages || []) {
    raw.push(...entryToSnippets(entry, options.name, options.identityHint, entry.sourceType === "gov" ? "gov" : "web"));
  }

  for (const entry of options.baikeEntries) {
    raw.push(...entryToSnippets(entry, options.name, options.identityHint, "baike"));
  }
  if (options.wiki) {
    raw.push(...entryToSnippets(options.wiki, options.name, options.identityHint, "wiki"));
  }

  for (const item of options.webResults || []) {
    const text = `${item.title} ${item.snippet}`;
    const lower = text.toLowerCase();
    if (exclude.some((k) => lower.includes(k))) continue;
    if (JUNK_PATTERNS.some((p) => p.test(text))) continue;
    const score = scoreParagraph(text, options.name, options.identityHint);
    if (score < minScore) continue;
    raw.push({
      sourceType: item.url.includes(".gov.cn") ? "gov" : "web",
      title: item.title,
      url: item.url,
      category: classifyParagraph(text),
      excerpt: item.snippet.slice(0, 600),
      relevanceScore: score,
    });
  }

  const seen = new Set<string>();
  return raw
    .filter((f) => {
      const key = f.excerpt.slice(0, 80);
      if (seen.has(key)) return false;
      seen.add(key);
      return f.relevanceScore >= minScore;
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 48);
}

/** 将事实包格式化为第四步整合专用上下文（不含碎新闻） */
export function formatFactBundleForIntegration(bundle: {
  name: string;
  identityHint: string;
  facts: FactSnippet[];
  baikeEntries: EnrichedSource[];
  wiki: EnrichedSource | null;
  webCrawlPages?: EnrichedSource[];
}): string {
  const blocks: string[] = [
    `【主题人物】${bundle.name}`,
    bundle.identityHint ? `【已确认身份】${bundle.identityHint}` : "",
    "【第三步：已筛选的相关事实（仅供第四步 AI 整合重写，禁止照抄原文）】",
  ].filter(Boolean);

  const webCrawl = bundle.webCrawlPages || [];
  if (webCrawl.length) {
    blocks.push(
      webCrawl
        .slice(0, 6)
        .map(
          (p, i) =>
            `[网页直爬 ${i + 1}] ${p.title}\n${p.url}\n${(p.fullText || p.snippet || "").slice(0, 5000)}`,
        )
        .join("\n\n"),
    );
  }

  const baikeBody = bundle.baikeEntries[0]?.fullText || bundle.baikeEntries[0]?.snippet;
  if (baikeBody && baikeBody.length >= 150) {
    blocks.push(
      `[百度百科 ${bundle.baikeEntries[0].url}]\n${baikeBody.slice(0, 12000)}`,
    );
  } else if (bundle.wiki?.fullText || bundle.wiki?.snippet) {
    blocks.push(
      `[维基百科 ${bundle.wiki.url}]\n${(bundle.wiki.fullText || bundle.wiki.snippet || "").slice(0, 12000)}`,
    );
  }

  if (bundle.facts.length) {
    blocks.push(
      `【高相关事实摘录 ${bundle.facts.length} 条】\n${bundle.facts
        .slice(0, 24)
        .map(
          (f, i) =>
            `${i + 1}. [${f.category}/${f.sourceType}] ${f.title}\n${f.excerpt.slice(0, 400)}`,
        )
        .join("\n\n")}`,
    );
  }

  return blocks.join("\n\n").slice(0, 28000);
}
