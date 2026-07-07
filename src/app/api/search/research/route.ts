import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { gatherEntityResearch } from "@/lib/search/gather-research";
import { isWebSearchConfigured, getActiveSearchProviders } from "@/lib/search/web-search";

const Schema = z.object({
  name: z.string().min(1),
  type: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type } = Schema.parse(body);
    const research = await gatherEntityResearch(name, type || "company");

    return NextResponse.json({
      name,
      type: type || "company",
      configured: {
        webSearchApi: isWebSearchConfigured(),
        baike: true,
        wiki: true,
        fallback: "bing-cn",
      },
      sourceCount: research.sourceCount,
      baikeCount: research.baikeEntries.length,
      baike: research.baike
        ? {
            title: research.baike.title,
            url: research.baike.url,
            textLength: research.baike.fullText?.length || 0,
            preview: research.baike.fullText?.slice(0, 500),
          }
        : null,
      baikeEntries: research.baikeEntries.map((e) => ({
        title: e.title,
        url: e.url,
        textLength: e.fullText?.length || 0,
      })),
      wiki: research.wiki
        ? { title: research.wiki.title, url: research.wiki.url, textLength: research.wiki.fullText?.length || 0 }
        : null,
      steps: research.steps,
      news: research.news,
      webResults: research.webResults,
      contextPreview: research.contextText.slice(0, 3000),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: "检索失败" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    webSearchApiConfigured: isWebSearchConfigured(),
    providers: {
      exa: Boolean(process.env.EXA_API_KEY),
      brave: Boolean(process.env.BRAVE_SEARCH_API_KEY),
      serper: Boolean(process.env.SERPER_API_KEY),
      tavily: Boolean(process.env.TAVILY_API_KEY),
      jina: Boolean(process.env.JINA_API_KEY),
      bingCn: true,
      duckduckgo: true,
      googleNewsRss: true,
    },
    activeProviders: getActiveSearchProviders(),
    note: "推荐 EXA_API_KEY 或 BRAVE_SEARCH_API_KEY；未配置时使用 Tavily/Serper 或 Bing + DuckDuckGo 兜底",
  });
}
