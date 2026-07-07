import { unstable_cache } from "next/cache";
import { discoverBrandImages } from "@/lib/search/discover-brand-images";
import type { ImageSearchHit } from "@/lib/search/image-search";

export type BrandEntityType = "company" | "brand" | "person" | "city";

export function isBrandImageEntityType(type: string): type is BrandEntityType {
  return type === "company" || type === "brand" || type === "person" || type === "city";
}

/** 服务端缓存的品牌搜图（按名称 + 类型，24h 刷新） */
export function getCachedBrandImages(
  brandName: string,
  entityType: BrandEntityType,
  limit = 9,
): Promise<ImageSearchHit[]> {
  const key = `brand-images:${entityType}:${brandName}`;
  return unstable_cache(
    () => discoverBrandImages({ brandName, entityType, limit }),
    [key],
    { revalidate: 86400, tags: [key] },
  )();
}

/** 实体页：已有相册较少时自动补搜相关图片 */
export async function discoverImagesForEntityPage(
  name: string,
  type: string,
  existingGalleryCount: number,
): Promise<ImageSearchHit[]> {
  if (!isBrandImageEntityType(type)) return [];
  if (existingGalleryCount >= 3) return [];

  try {
    return await getCachedBrandImages(name, type, 9);
  } catch {
    return [];
  }
}
