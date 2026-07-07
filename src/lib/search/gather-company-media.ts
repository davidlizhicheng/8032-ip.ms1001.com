import { fetchBaikeMediaForEntries } from "@/lib/search/baike-media";
import type { ResearchBundle } from "@/lib/search/research-types";
import { isRelevantBrandImage } from "@/lib/search/brand-image-relevance";
import { discoverBrandImages } from "@/lib/search/discover-brand-images";
import { normalizeImageUrl } from "@/lib/search/image-search";
function extractOgImages(html: string, pageUrl: string): string[] {
  const urls: string[] = [];
  const patterns = [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/gi,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/gi,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/gi,
  ];
  for (const re of patterns) {
    for (const m of html.matchAll(re)) {
      const u = normalizeImageUrl(m[1], pageUrl);
      if (u && !urls.includes(u)) urls.push(u);
    }
  }
  return urls;
}

export type CompanyMedia = {
  coverUrl?: string;
  galleryImages: Array<{ url: string; type: string; title?: string }>;
  source: string;
};

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

function isRelevantCompanyImage(url: string, name: string, title?: string): boolean {
  return isRelevantBrandImage(name, { url, title, source: "bing" });
}

/** 企业/品牌：百科图 → 网页 og:image → Bing 品牌图（仅保留相关图片） */
export async function gatherCompanyMedia(
  name: string,
  research: ResearchBundle,
): Promise<CompanyMedia | null> {
  const gallery: Array<{ url: string; type: string; title?: string }> = [];
  let coverUrl: string | undefined;
  let source = "";

  const baikeEntries = research.baikeEntries.slice(0, 2);
  if (baikeEntries.length) {
    const baikeMedia = await fetchBaikeMediaForEntries(baikeEntries);
    if (baikeMedia?.coverUrl) {
      coverUrl = baikeMedia.coverUrl;
      source = "baike";
    }
    for (const url of baikeMedia?.galleryUrls || []) {
      if (!gallery.some((g) => g.url === url)) {
        gallery.push({ url, type: "gallery", title: `${name}百科图` });
      }
    }
  }

  const pageCandidates = [
    ...research.webCrawlPages,
    ...research.pageExcerpts,
    ...(research.wiki ? [research.wiki] : []),
  ].slice(0, 8);

  for (const page of pageCandidates) {
    if (!page.url || gallery.length >= 6) break;
    try {
      const res = await fetch(page.url, {
        headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const html = await res.text();
      for (const img of extractOgImages(html, page.url)) {
        const pageTitle = page.title?.slice(0, 40) || name;
        if (!isRelevantCompanyImage(img, name, pageTitle)) continue;
        if (!gallery.some((g) => g.url === img)) {
          gallery.push({ url: img, type: "gallery", title: page.title?.slice(0, 40) || name });
          if (!coverUrl) {
            coverUrl = img;
            source = source || "og-image";
          }
        }
        if (gallery.length >= 6) break;
      }
    } catch {
      /* skip */
    }
  }

  if (gallery.length < 3) {
    const bingHits = await discoverBrandImages({
      brandName: name,
      entityType: "company",
      limit: 8,
    });
    for (const hit of bingHits) {
      if (!gallery.some((g) => g.url === hit.url)) {
        gallery.push({ url: hit.url, type: "gallery", title: hit.title || `${name}相关图` });
        if (!coverUrl) {
          coverUrl = hit.url;
          source = source || "bing-images";
        }
      }
      if (gallery.length >= 6) break;
    }
  }

  if (!coverUrl && !gallery.length) return null;
  return {
    coverUrl: coverUrl || gallery[0]?.url,
    galleryImages: gallery.slice(0, 8),
    source: source || "web",
  };
}
