import { NextResponse } from "next/server";

const USER_AGENT =
  process.env.WIKIMEDIA_USER_AGENT ||
  "BrandNet-IP-Card-AI/1.0 (contact: admin@ms1001.com)";

type Probe = {
  name: string;
  url: string;
  ok: boolean;
  useful: boolean;
  status?: number;
  ms: number;
  bytes?: number;
  sample?: string;
  error?: string;
};

function usefulResponse(name: string, ok: boolean, text: string): boolean {
  if (!ok) return false;
  if (name === "baidu_baike_openapi") {
    return text.length > 80 && !/^{"errno":0}$/.test(text.trim());
  }
  if (name.includes("wikipedia") || name.includes("wikidata")) {
    return text.length > 80 && !text.includes('"search":[]');
  }
  return text.length > 80;
}

async function probe(name: string, url: string, headers: HeadersInit = {}): Promise<Probe> {
  const started = Date.now();
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json,text/html;q=0.8,*/*;q=0.5",
        ...headers,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    const text = await res.text();
    return {
      name,
      url,
      ok: res.ok,
      useful: usefulResponse(name, res.ok, text),
      status: res.status,
      ms: Date.now() - started,
      bytes: text.length,
      sample: text.slice(0, 240),
    };
  } catch (error) {
    return {
      name,
      url,
      ok: false,
      useful: false,
      ms: Date.now() - started,
      error: error instanceof Error ? error.message : "request failed",
    };
  }
}

export async function GET() {
  const query = "\u9a6c\u4e91";
  const encoded = encodeURIComponent(query);
  const probes = await Promise.all([
    probe("baidu_baike_openapi", `https://baike.baidu.com/api/openapi/BkItemCard?lemmaTitle=${encoded}`, {
      Referer: "https://baike.baidu.com/",
    }),
    probe("baidu_baike_page", `https://baike.baidu.com/item/${encoded}`, {
      Referer: "https://www.baidu.com/",
      Accept: "text/html,application/xhtml+xml",
    }),
    probe(
      "wikipedia_action_zh",
      `https://zh.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encoded}&format=json&srlimit=1&origin=*`,
    ),
    probe("wikipedia_rest_zh", `https://zh.wikipedia.org/api/rest_v1/page/summary/${encoded}`),
    probe(
      "wikidata_search",
      `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encoded}&language=zh&format=json&limit=1&origin=*`,
    ),
  ]);

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    query,
    probes,
    recommendation: {
      mainlandChina:
        "Prefer local cache and Baidu Baike/search first. Use Wikipedia/Wikidata official APIs opportunistically with timeout and non-blocking fallback.",
      healthSemantics:
        "ok means the endpoint responded; useful means the response contains enough candidate content for identity confirmation.",
      generationGate:
        "Person generation must still require confirmedCandidateId before writing content.",
    },
  });
}