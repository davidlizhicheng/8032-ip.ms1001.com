import type { EnrichedSource } from "@/lib/search/baike-fetcher";
import { cleanEncyclopediaText, looksLikeRawEncyclopediaDump } from "@/lib/content/source-clean";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

function decodeBasicEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripHtml(value: string): string {
  return decodeBasicEntities(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function trimText(value: string, limit: number): string {
  if (value.length <= limit) return value;
  return `${value.slice(0, limit)}…`;
}

/** 从 HTML 提取正文：优先 article/main/常见 CMS 容器 */
function extractMainText(html: string): string {
  const candidates: string[] = [];

  const regionPatterns = [
    /<article[^>]*>([\s\S]*?)<\/article>/gi,
    /<main[^>]*>([\s\S]*?)<\/main>/gi,
    /<div[^>]*class="[^"]*(?:article-content|post-content|rich-text|content-body|article-body|entry-content|TRS_Editor|Custom_UnionStyle)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
  ];

  for (const pattern of regionPatterns) {
    for (const match of html.matchAll(pattern)) {
      const text = stripHtml(match[1]);
      if (text.length >= 120) candidates.push(text);
    }
  }

  const paragraphs = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((m) => stripHtml(m[1]))
    .filter((t) => t.length > 25 && !/cookie|javascript|登录|注册|广告/.test(t))
    .filter((t) => !looksLikeRawEncyclopediaDump(t));

  if (paragraphs.length >= 2) {
    candidates.push(paragraphs.join("\n"));
  }

  if (!candidates.length) {
    const metaDesc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
    if (metaDesc?.[1]) candidates.push(stripHtml(metaDesc[1]));
  }

  candidates.sort((a, b) => b.length - a.length);
  return candidates[0] || "";
}

export async function fetchPageExcerpt(
  url: string,
  titleHint: string,
): Promise<EnrichedSource | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      },
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;

    const html = await res.text();
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = stripHtml(titleMatch?.[1] || titleHint).slice(0, 120) || titleHint;

    let body = trimText(extractMainText(html), 8000);
    if (url.includes("wikipedia.org")) {
      body = cleanEncyclopediaText(body, "wiki");
    } else if (url.includes("baike.baidu.com")) {
      body = cleanEncyclopediaText(body, "baike");
    } else {
      body = cleanEncyclopediaText(body, "web");
    }
    if (body.length < 80) return null;

    let host = "web";
    try {
      host = new URL(url).hostname.replace(/^www\./, "");
    } catch {
      /* ignore */
    }

    return {
      title,
      url,
      snippet: trimText(body, 300),
      fullText: body,
      source: host,
      provider: "page-fetch",
      sourceType: host.endsWith(".gov.cn") ? "gov" : "web",
      confidenceScore: host.endsWith(".gov.cn") ? 0.9 : 0.65,
    };
  } catch {
    return null;
  }
}
