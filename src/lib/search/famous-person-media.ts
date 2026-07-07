import { searchWebMulti } from "@/lib/search/web-search";
import { fetchBaikeMediaForEntries } from "@/lib/search/baike-media";
import { isFamousPerson } from "@/lib/search/famous-person";
import { expandPersonSearchNames } from "@/lib/search/person-name-aliases";
import type { ResearchBundle } from "@/lib/search/research-types";
import { parseVideoUrl } from "@/lib/video/parser";
import { searchImages } from "@/lib/search/image-search";

export type FamousPersonMedia = {
  avatarUrl?: string;
  coverUrl?: string;
  galleryImages: Array<{ url: string; type: string; title?: string }>;
  videos: Array<{
    platform: string;
    url: string;
    title?: string;
    coverUrl?: string;
    embedUrl?: string;
    canEmbed: boolean;
  }>;
  source: string;
};

const USER_AGENT = "Mozilla/5.0 (compatible; BrandNet/1.0; +https://brandnet.local)";

function normalizeImageUrl(raw: string): string | null {
  let url = raw.replace(/&amp;/g, "&").trim();
  if (url.startsWith("//")) url = `https:${url}`;
  if (!url.startsWith("http")) return null;
  if (!/\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url) && !url.includes("bkimg") && !url.includes("bcebos")) {
    return null;
  }
  return url;
}

async function searchPersonImages(name: string): Promise<string[]> {
  const names = expandPersonSearchNames(name);
  const queries = names.flatMap((n) => [
    `${n} 照片 site:baike.baidu.com`,
    `${n} 官方 肖像`,
    `${n} portrait photo`,
  ]);

  const webImages = await searchWebMulti(queries.slice(0, 4), 2, 4);
  const imageUrls: string[] = [];
  const seen = new Set<string>();

  for (const item of webImages) {
    const imgMatch = item.url.match(/\.(jpg|jpeg|png|webp)/i);
    if (imgMatch) {
      const url = normalizeImageUrl(item.url);
      if (url && !seen.has(url)) {
        seen.add(url);
        imageUrls.push(url);
      }
    }
  }

  for (const n of names.slice(0, 3)) {
    const bing = await searchImages({
      query: `${n} 官方 肖像 人物照片`,
      brandName: n,
      entityType: "person",
      includeBaike: false,
      limit: 6,
    });
    for (const hit of bing) {
      const url = hit.url;
      if (!seen.has(url)) {
        seen.add(url);
        imageUrls.push(url);
      }
    }
    if (imageUrls.length >= 4) break;
  }

  return imageUrls.slice(0, 6);
}

export async function gatherFamousPersonMedia(
  name: string,
  research: ResearchBundle,
): Promise<FamousPersonMedia | null> {
  if (!isFamousPerson(research, name)) return null;

  const baikeMedia = await fetchBaikeMediaForEntries(research.baikeEntries);

  const searchNames = expandPersonSearchNames(name);
  const videoQueries = searchNames.flatMap((n) => [
    `${n} 专访 site:bilibili.com`,
    `${n} 演讲 site:bilibili.com`,
    `${n} 采访 site:bilibili.com`,
    `${n} interview site:youtube.com`,
    `${n} documentary site:youtube.com`,
  ]);

  const webVideos = await searchWebMulti(videoQueries.slice(0, 6), 3, 8);

  const videos: FamousPersonMedia["videos"] = [];
  const seenVideo = new Set<string>();

  for (const url of baikeMedia.pageVideoUrls) {
    if (seenVideo.has(url)) continue;
    seenVideo.add(url);
    const parsed = parseVideoUrl(url);
    if (parsed.platform !== "unknown") {
      videos.push({
        platform: parsed.platform,
        url: parsed.url,
        title: `${name} 相关视频`,
        coverUrl: parsed.cover_url,
        embedUrl: parsed.embed_url,
        canEmbed: parsed.can_embed,
      });
    }
  }

  for (const item of webVideos) {
    if (seenVideo.has(item.url)) continue;
    const parsed = parseVideoUrl(item.url);
    if (parsed.platform === "unknown") continue;
    seenVideo.add(item.url);
    videos.push({
      platform: parsed.platform,
      url: parsed.url,
      title: item.title,
      coverUrl: parsed.cover_url,
      embedUrl: parsed.embed_url,
      canEmbed: parsed.can_embed,
    });
    if (videos.length >= 5) break;
  }

  let galleryUrls = [...baikeMedia.galleryUrls];
  if (galleryUrls.length < 2) {
    const extra = await searchPersonImages(name);
    const seen = new Set(galleryUrls);
    for (const url of extra) {
      if (!seen.has(url)) {
        seen.add(url);
        galleryUrls.push(url);
      }
    }
  }

  const galleryImages = galleryUrls.slice(0, 8).map((url, i) => ({
    url,
    type: i === 0 ? "cover" : "gallery",
    title: i === 0 ? `${name} 百科主图` : `${name} 图片 ${i + 1}`,
  }));

  const avatarUrl = baikeMedia.avatarUrl || galleryUrls[0];
  const coverUrl = baikeMedia.coverUrl || galleryUrls[0];

  if (!avatarUrl && !coverUrl && !galleryImages.length && !videos.length) {
    return null;
  }

  return {
    avatarUrl,
    coverUrl,
    galleryImages,
    videos,
    source: research.baikeEntries[0]?.url ? "百度百科" : "公开检索",
  };
}
