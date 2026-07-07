import { prisma } from "@/lib/prisma";
import { gatherEntityResearch } from "@/lib/search/gather-research";
import { dedupeSources } from "@/lib/search/source-dedupe";
import { gatherPersonMediaFallback } from "@/lib/search/person-media-fallback";

type RefreshOptions = {
  limit?: number;
  minAgeDays?: number;
  type?: "city" | "company" | "person";
};

function staleBefore(days: number): Date {
  return new Date(Date.now() - days * 86400000);
}

export async function refreshPublicEntitiesWeekly(options: RefreshOptions = {}) {
  const limit = Math.min(Math.max(options.limit ?? 12, 1), 50);
  const minAgeDays = Math.max(options.minAgeDays ?? 7, 1);
  const entities = await prisma.entity.findMany({
    where: {
      type: options.type,
      visibility: "public",
      status: { in: ["published", "claimed", "verified"] },
      updatedAt: { lt: staleBefore(minAgeDays) },
    },
    include: { sources: true, mediaAssets: true, videoLinks: true },
    orderBy: [{ isFeatured: "desc" }, { updatedAt: "asc" }],
    take: limit,
  });

  const results: Array<{ name: string; addedSources: number; addedNews: number; addedMedia: number; addedVideos: number }> = [];

  for (const entity of entities) {
    const research = await gatherEntityResearch(entity.name, entity.type as "city" | "company" | "person", {
      fetchNews: true,
    });
    const existingUrls = new Set([
      ...entity.sources.map((s) => s.url || ""),
      ...entity.mediaAssets.map((m) => m.url),
      ...entity.videoLinks.map((v) => v.url),
    ]);
    const sources = dedupeSources([
      ...research.webResults.map((s) => ({
        title: s.title,
        url: s.url,
        source_type: "web" as const,
        excerpt: s.snippet,
        confidence_score: 0.75,
      })),
      ...research.pageExcerpts.map((s) => ({
        title: s.title,
        url: s.url,
        source_type: s.sourceType === "gov" ? ("official" as const) : ("web" as const),
        excerpt: (s.fullText || s.snippet || "").slice(0, 500),
        confidence_score: s.confidenceScore,
      })),
    ]).filter((s) => s.url && !existingUrls.has(s.url)).slice(0, 5);

    const news = research.news
      .filter((n) => n.url && !existingUrls.has(n.url))
      .slice(0, 4);

    let media = null;
    if (entity.type === "person") {
      media = await gatherPersonMediaFallback(entity.name, { summary: research.contextText.slice(0, 400) }).catch(() => null);
    }
    const images = (media?.galleryImages || []).filter((img) => !existingUrls.has(img.url)).slice(0, 4);
    const videos = (media?.videos || []).filter((video) => !existingUrls.has(video.url)).slice(0, 3);

    await prisma.$transaction([
      ...sources.map((s) =>
        prisma.entitySource.create({
          data: {
            entityId: entity.id,
            sourceType: s.source_type,
            title: s.title,
            url: s.url,
            excerpt: s.excerpt,
            confidenceScore: s.confidence_score,
          },
        }),
      ),
      ...news.map((n) =>
        prisma.newsArticle.create({
          data: {
            entityId: entity.id,
            title: n.title,
            url: n.url,
            source: n.source,
            publishedAt: n.publishedAt,
            excerpt: n.excerpt,
          },
        }),
      ),
      ...images.map((img, i) =>
        prisma.mediaAsset.create({
          data: {
            entityId: entity.id,
            url: img.url,
            type: img.type,
            title: img.title,
            sortOrder: entity.mediaAssets.length + i,
          },
        }),
      ),
      ...videos.map((video, i) =>
        prisma.videoLink.create({
          data: {
            entityId: entity.id,
            platform: video.platform,
            url: video.url,
            title: video.title,
            coverUrl: video.coverUrl,
            embedUrl: video.embedUrl,
            canEmbed: video.canEmbed,
            sortOrder: entity.videoLinks.length + i,
          },
        }),
      ),
      prisma.entity.update({ where: { id: entity.id }, data: { updatedAt: new Date() } }),
    ]);

    results.push({
      name: entity.name,
      addedSources: sources.length,
      addedNews: news.length,
      addedMedia: images.length,
      addedVideos: videos.length,
    });
  }

  return { scanned: entities.length, results };
}
