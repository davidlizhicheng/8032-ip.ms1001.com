/**
 * PageReader：URL → 正文 Markdown/纯文本
 * 第一层 fetch；第二层（可选）Playwright；第三层 Jina/Firecrawl 兜底
 */
import { cleanEncyclopediaText, looksLikeRawEncyclopediaDump } from "@/lib/content/source-clean";
import { scrapeWithFirecrawl } from "@/lib/search/firecrawl-search";
import { fetchPageExcerpt } from "@/lib/search/page-fetcher";

export type PageReaderResult = {
  url: string;
  title: string;
  text: string;
  charCount: number;
  method: "fetch" | "playwright" | "jina" | "firecrawl";
  ok: boolean;
};

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

async function fetchViaJina(url: string): Promise<string | null> {
  const apiKey = process.env.JINA_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "text/plain" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const text = (await res.text()).trim();
    return text.length >= 100 ? text : null;
  } catch {
    return null;
  }
}

function normalizeText(raw: string, sourceKind: "web" | "wiki" | "baike" = "web"): string {
  const clean = cleanEncyclopediaText(raw, sourceKind);
  if (clean.length < 80) return "";
  if (looksLikeRawEncyclopediaDump(clean)) return "";
  return clean.slice(0, 30000);
}

export async function readPage(url: string, titleHint = ""): Promise<PageReaderResult> {
  const empty: PageReaderResult = {
    url,
    title: titleHint || url,
    text: "",
    charCount: 0,
    method: "fetch",
    ok: false,
  };

  // 第一层：普通 fetch + 正文抽取
  const page = await fetchPageExcerpt(url, titleHint);
  if (page?.fullText && page.fullText.length >= 150) {
    const text = normalizeText(page.fullText);
    if (text.length >= 150) {
      return {
        url,
        title: page.title || titleHint,
        text,
        charCount: text.length,
        method: "fetch",
        ok: true,
      };
    }
  }

  // 第三层兜底：Jina / Firecrawl
  const jina = await fetchViaJina(url);
  if (jina) {
    const text = normalizeText(jina);
    if (text.length >= 150) {
      return { url, title: titleHint || url, text, charCount: text.length, method: "jina", ok: true };
    }
  }

  const firecrawl = await scrapeWithFirecrawl(url);
  if (firecrawl) {
    const text = normalizeText(firecrawl);
    if (text.length >= 150) {
      return { url, title: titleHint || url, text, charCount: text.length, method: "firecrawl", ok: true };
    }
  }

  // 第二层 Playwright：设置 ENABLE_PLAYWRIGHT_READER=true 且安装 playwright 后启用
  if (process.env.ENABLE_PLAYWRIGHT_READER === "true") {
    try {
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const pwModule = (await Function('return import("playwright")')()) as {
        chromium: { launch: (opts: { headless: boolean }) => Promise<{ newPage: () => Promise<{ goto: (u: string, o: object) => Promise<void>; content: () => Promise<string> }>; close: () => Promise<void> }> };
      };
      const browser = await pwModule.chromium.launch({ headless: true });
      const pageObj = await browser.newPage();
      await pageObj.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
      const html = await pageObj.content();
      await browser.close();
      const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
      const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
      const raw = (articleMatch?.[1] || mainMatch?.[1] || html)
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      const text = normalizeText(raw);
      if (text.length >= 150) {
        return { url, title: titleHint || url, text, charCount: text.length, method: "playwright", ok: true };
      }
    } catch {
      // playwright optional
    }
  }

  return empty;
}
