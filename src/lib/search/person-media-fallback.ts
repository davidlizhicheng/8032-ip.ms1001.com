import crypto from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { generateBrandVisual } from "@/lib/ai/poster-image";
import { searchImages } from "@/lib/search/image-search";
import type { FamousPersonMedia } from "@/lib/search/famous-person-media";
import { searchWebMulti } from "@/lib/search/web-search";
import { parseVideoUrl } from "@/lib/video/parser";
import { getUploadDir } from "@/lib/storage/upload-dir";
import {
  localUploadServePath,
  normalizeStoredAssetUrl,
} from "@/lib/storage/public-url";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function saveFallbackSvg(name: string, identityHint?: string): Promise<string> {
  const uploadDir = getUploadDir();
  await mkdir(uploadDir, { recursive: true });
  const hash = crypto
    .createHash("sha1")
    .update(`${name}-${identityHint || ""}`)
    .digest("hex")
    .slice(0, 12);
  const filename = `person-fallback-${hash}.svg`;
  const filepath = path.join(uploadDir, filename);
  const initials = Array.from(name.trim()).slice(0, 2).join("");
  const label = identityHint?.slice(0, 28) || "公开人物资料卡";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#fff7ed"/>
      <stop offset="0.52" stop-color="#e0f2fe"/>
      <stop offset="1" stop-color="#f8fafc"/>
    </linearGradient>
    <linearGradient id="card" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#f97316"/>
      <stop offset="1" stop-color="#0ea5e9"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="900" fill="url(#bg)"/>
  <circle cx="170" cy="130" r="120" fill="#fde68a" opacity=".45"/>
  <circle cx="1010" cy="210" r="160" fill="#bae6fd" opacity=".55"/>
  <rect x="210" y="145" width="780" height="610" rx="42" fill="#ffffff" opacity=".82"/>
  <circle cx="600" cy="350" r="150" fill="url(#card)" opacity=".95"/>
  <circle cx="545" cy="320" r="18" fill="#fff7ed"/>
  <circle cx="655" cy="320" r="18" fill="#fff7ed"/>
  <path d="M520 410c55 50 115 50 170 0" fill="none" stroke="#fff7ed" stroke-width="18" stroke-linecap="round"/>
  <text x="600" y="585" text-anchor="middle" font-family="Arial, 'Microsoft YaHei', sans-serif" font-size="82" font-weight="800" fill="#0f172a">${escapeXml(initials)}</text>
  <text x="600" y="655" text-anchor="middle" font-family="Arial, 'Microsoft YaHei', sans-serif" font-size="34" font-weight="700" fill="#334155">${escapeXml(name)}</text>
  <text x="600" y="706" text-anchor="middle" font-family="Arial, 'Microsoft YaHei', sans-serif" font-size="24" fill="#64748b">${escapeXml(label)}</text>
</svg>`;
  await writeFile(filepath, svg, "utf8");
  return normalizeStoredAssetUrl(localUploadServePath(filename))!;
}

function videoSearchFallbacks(name: string): FamousPersonMedia["videos"] {
  const q = encodeURIComponent(name);
  return [
    {
      platform: "bilibili_search",
      url: `https://search.bilibili.com/all?keyword=${q}`,
      title: `${name} B站公开视频检索`,
      canEmbed: false,
    },
    {
      platform: "baidu_video_search",
      url: `https://www.baidu.com/s?tn=baiduvideo&word=${q}%20视频`,
      title: `${name} 全网视频检索`,
      canEmbed: false,
    },
  ];
}

async function searchPersonVideos(name: string): Promise<FamousPersonMedia["videos"]> {
  const queries = [
    `${name} 专访 site:bilibili.com/video`,
    `${name} 演讲 site:bilibili.com/video`,
    `${name} 采访 site:bilibili.com/video`,
    `${name} 访谈 site:v.qq.com`,
    `${name} 演讲 site:youtube.com/watch`,
    `${name} 纪录片 site:bilibili.com/video`,
  ];
  const hits = await searchWebMulti(queries, 4, 12);
  const videos: FamousPersonMedia["videos"] = [];
  const seen = new Set<string>();

  for (const hit of hits) {
    if (seen.has(hit.url)) continue;
    const parsed = parseVideoUrl(hit.url);
    if (parsed.platform === "unknown") continue;
    seen.add(hit.url);
    videos.push({
      platform: parsed.platform,
      url: parsed.url,
      title: hit.title || parsed.title,
      coverUrl: parsed.cover_url,
      embedUrl: parsed.embed_url,
      canEmbed: parsed.can_embed,
    });
    if (videos.length >= 5) break;
  }

  for (const fallback of videoSearchFallbacks(name)) {
    if (videos.length >= 5) break;
    if (seen.has(fallback.url)) continue;
    videos.push(fallback);
  }

  return videos;
}

export async function gatherPersonMediaFallback(
  name: string,
  options: { identityHint?: string; summary?: string } = {},
): Promise<FamousPersonMedia> {
  const videos = await searchPersonVideos(name).catch(() => videoSearchFallbacks(name));
  const hits = await searchImages({
    query: `${name} 官方 肖像 人物照片 访谈`,
    brandName: name,
    entityType: "person",
    includeBaike: true,
    limit: 6,
  });

  if (hits.length) {
    const galleryImages = hits.slice(0, 6).map((hit, i) => ({
      url: hit.url,
      type: i === 0 ? "cover" : "gallery",
      title: hit.title || `${name}公开图片 ${i + 1}`,
    }));
    return {
      avatarUrl: galleryImages[0]?.url,
      coverUrl: galleryImages[0]?.url,
      galleryImages,
      videos,
      source: "全网图片搜索",
    };
  }

  if (process.env.FENNO_API_KEY || process.env.POSTER_API_KEY) {
    try {
      const visual = await generateBrandVisual({
        template: "ip-creative",
        brandName: name,
        entityType: "person",
        summary: options.summary || options.identityHint || `${name}个人品牌形象`,
        userPrompt:
          "生成一张现代中文个人品牌漫画肖像插画，不要真实人脸，不要冒充照片，适合名片封面和人物报告。",
      });
      return {
        avatarUrl: visual.url,
        coverUrl: visual.url,
        galleryImages: [{ url: visual.url, type: "poster", title: `${name}个人品牌插画` }],
        videos,
        source: "AI插画兜底",
      };
    } catch (error) {
      console.warn("[person-media-fallback] AI visual failed:", error);
    }
  }

  const url = await saveFallbackSvg(name, options.identityHint);
  return {
    avatarUrl: url,
    coverUrl: url,
    galleryImages: [{ url, type: "poster", title: `${name}个人品牌插画` }],
    videos,
    source: "本地插画兜底",
  };
}
