import { fetchBaikeMediaForEntries } from "@/lib/search/baike-media";
import type { ResearchBundle } from "@/lib/search/research-types";
import { discoverBrandImages } from "@/lib/search/discover-brand-images";

export type CityMedia = {
  coverUrl?: string;
  galleryImages: Array<{ url: string; type: string; title?: string }>;
  source: string;
};

/** 为城市实体检索封面图：优先百科摘要图，其次 Bing 城市风景检索（仅相关图片） */
export async function gatherCityMedia(
  name: string,
  research: ResearchBundle,
): Promise<CityMedia | null> {
  const baikeEntries = research.baikeEntries.slice(0, 2);
  const baikeMedia = baikeEntries.length
    ? await fetchBaikeMediaForEntries(baikeEntries)
    : null;

  const bingHits = await discoverBrandImages({
    brandName: name,
    entityType: "city",
    limit: 8,
  });
  const bingUrls = bingHits.map((h) => h.url);

  const coverUrl = baikeMedia?.coverUrl || bingUrls[0];
  const galleryUrls = [
    ...(baikeMedia?.galleryUrls || []),
    ...bingUrls,
  ].filter((u, i, arr) => arr.indexOf(u) === i);

  if (!coverUrl && galleryUrls.length === 0) return null;

  return {
    coverUrl: coverUrl || galleryUrls[0],
    galleryImages: galleryUrls.slice(0, 8).map((url, i) => ({
      url,
      type: i === 0 ? "cover" : "gallery",
      title: i === 0 ? `${name} 封面` : undefined,
    })),
    source: baikeMedia?.coverUrl ? "baike+bing" : "bing",
  };
}
