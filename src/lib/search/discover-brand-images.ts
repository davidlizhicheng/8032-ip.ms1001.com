import {
  filterRelevantBrandImages,
  scoreBrandImageRelevance,
} from "@/lib/search/brand-image-relevance";
import { searchImages, type ImageSearchHit, type ImageSearchOptions } from "@/lib/search/image-search";

export type DiscoverBrandImagesInput = {
  brandName: string;
  entityType?: ImageSearchOptions["entityType"];
  limit?: number;
};

/** 按品牌名搜索并只返回相关图片，按相关度排序 */
export async function discoverBrandImages(
  input: DiscoverBrandImagesInput,
): Promise<ImageSearchHit[]> {
  const name = input.brandName.trim();
  if (!name) return [];

  const limit = Math.min(Math.max(input.limit ?? 12, 1), 24);
  const raw = await searchImages({
    query: name,
    brandName: name,
    entityType: input.entityType,
    limit: limit * 2,
    includeBaike: true,
  });

  const relevant = filterRelevantBrandImages(name, raw);
  return relevant
    .map((hit) => ({ hit, score: scoreBrandImageRelevance(name, hit) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ hit }) => hit);
}
