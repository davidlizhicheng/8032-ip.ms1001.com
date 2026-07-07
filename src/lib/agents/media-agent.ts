import type { EntityLockResult, EvidencePack, MediaMatchResult, PipelineContext } from "@/lib/agents/types";
import { createStreamEmitter } from "@/lib/agents/stream-events";
import { gatherFamousPersonMedia } from "@/lib/search/famous-person-media";
import { gatherPersonMediaFallback } from "@/lib/search/person-media-fallback";
import { gatherCityMedia } from "@/lib/search/gather-city-media";
import { gatherCompanyMedia } from "@/lib/search/gather-company-media";
import { generateBrandVisual } from "@/lib/ai/poster-image";
import type { ResearchBundle } from "@/lib/search/research-types";

function evidenceToResearchBundle(evidence: EvidencePack): ResearchBundle {
  const webCrawlPages = evidence.sources
    .filter((s) => s.sourceType === "web" || s.sourceType === "gov" || s.sourceType === "news")
    .map((s) => ({
      title: s.title,
      url: s.url,
      snippet: s.text.slice(0, 400),
      fullText: s.text,
      source: s.sourceType,
      provider: "evidence",
      sourceType: s.sourceType === "gov" ? ("gov" as const) : ("web" as const),
      confidenceScore: s.qualityScore,
    }));

  const baikeEntries = evidence.sources
    .filter((s) => s.sourceType === "baike")
    .map((s) => ({
      title: s.title,
      url: s.url,
      snippet: s.text.slice(0, 400),
      fullText: s.text,
      source: "baike.baidu.com",
      provider: "evidence",
      sourceType: "baike" as const,
      confidenceScore: s.qualityScore,
    }));

  const wikiSource = evidence.sources.find((s) => s.sourceType === "wiki");

  return {
    news: [],
    webResults: [],
    baikeEntries,
    wiki: wikiSource
      ? {
          title: wikiSource.title,
          url: wikiSource.url,
          snippet: wikiSource.text.slice(0, 400),
          fullText: wikiSource.text,
          source: "wikipedia.org",
          provider: "evidence",
          sourceType: "wiki",
          confidenceScore: wikiSource.qualityScore,
        }
      : null,
    webCrawlPages,
    pageExcerpts: webCrawlPages,
    contextText: evidence.contextText,
    sourceCount: evidence.sources.length,
    steps: [],
  };
}

/** 多媒体匹配 Agent：图片/视频按段落需求匹配 */
export async function runMediaAgent(
  lock: EntityLockResult,
  evidence: EvidencePack,
  ctx: PipelineContext = {},
): Promise<MediaMatchResult> {
  const stream = createStreamEmitter(ctx);
  stream.status("正在匹配图片与视频…", "media");

  const research = evidenceToResearchBundle(evidence);
  const result: MediaMatchResult = { galleryImages: [], videos: [] };

  if (lock.type === "person") {
    const media =
      (await gatherFamousPersonMedia(lock.name, research)) ||
      (await gatherPersonMediaFallback(lock.name, {
        identityHint: lock.identityHint,
        summary: evidence.contextText.slice(0, 400),
      }));
    if (media) {
      result.coverUrl = media.coverUrl;
      result.avatarUrl = media.avatarUrl;
      result.galleryImages = media.galleryImages.map((img, i) => ({
        url: img.url,
        type: img.type,
        title: img.title,
        sectionId: i === 0 ? "hero" : "gallery",
        caption: img.title,
      }));
      result.videos = media.videos.map((v) => ({
        platform: v.platform,
        url: v.url,
        title: v.title,
        coverUrl: v.coverUrl,
        embedUrl: v.embedUrl,
        canEmbed: v.canEmbed,
        sectionId: "brand-story",
      }));
    }
  } else if (lock.type === "city") {
    const media = await gatherCityMedia(lock.name, research);
    if (media) {
      result.coverUrl = media.coverUrl;
      result.galleryImages = media.galleryImages.map((img) => ({
        url: img.url,
        type: img.type,
        title: img.title,
        sectionId: "city-hero",
        caption: img.title,
      }));
    }
  } else if (lock.type === "company" || lock.type === "brand") {
    const media = await gatherCompanyMedia(lock.name, research);
    if (media) {
      result.coverUrl = media.coverUrl;
      result.galleryImages = media.galleryImages.map((img, i) => ({
        url: img.url,
        type: img.type,
        title: img.title,
        sectionId: i === 0 ? "hero" : "gallery",
        caption: img.title,
      }));
      stream.status(`已从网络提取 ${media.galleryImages.length} 张品牌相关图片`, "media");
    }

    if (process.env.FENNO_API_KEY) {
      try {
        stream.status("Fenno AI 生成品牌介绍图…", "media");
        const visual = await generateBrandVisual({
          template: "brand-poster",
          brandName: lock.name,
          entityType: lock.type,
          summary: evidence.contextText.slice(0, 400),
        });
        result.coverUrl = result.coverUrl || visual.url;
        result.galleryImages.unshift({
          url: visual.url,
          type: "poster",
          title: `${lock.name}品牌介绍`,
          sectionId: "hero",
          caption: `${lock.name} AI 品牌介绍图`,
        });
        stream.image({ section: "hero", url: visual.url, caption: `${lock.name} 品牌介绍图` });
      } catch (err) {
        console.warn("[media-agent] Fenno brand poster failed:", err);
      }
    }
  }

  for (const img of result.galleryImages.slice(0, 6)) {
    stream.image({ section: img.sectionId, url: img.url, caption: img.caption });
  }
  for (const v of result.videos.slice(0, 3)) {
    stream.video({ section: v.sectionId, platform: v.platform, url: v.url, title: v.title });
  }

  stream.status(`媒体匹配完成：${result.galleryImages.length} 图 · ${result.videos.length} 视频`, "media");
  return result;
}
