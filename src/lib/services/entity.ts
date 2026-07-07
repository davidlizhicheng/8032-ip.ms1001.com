import { prisma } from "@/lib/prisma";
import { detectEntityType, entitySlug } from "@/lib/ai/detect-type";
import {
  generateEntityContent,
  generateReportContent,
} from "@/lib/ai/generate-entity";
import { runProductionPipeline, EntityLockRequiredError as PipelineLockError } from "@/lib/agents/production-pipeline";
import type { PipelineStreamEvent } from "@/lib/agents/types";
import { gatherEntityResearch } from "@/lib/search/gather-research";
import { buildBaikeOnlyContext } from "@/lib/search/baike-context";
import {
  fetchPersonFacts,
  formatFactBundleForIntegration,
} from "@/lib/pipeline/person-content-pipeline";
import { dedupeSources } from "@/lib/search/source-dedupe";
import { filterRealNews } from "@/lib/news/filter-news";
import { gatherCityMedia } from "@/lib/search/gather-city-media";
import { gatherFamousPersonMedia } from "@/lib/search/famous-person-media";
import { gatherPersonMediaFallback } from "@/lib/search/person-media-fallback";
import {
  resolveRegistryCandidate,
} from "@/lib/search/person-disambiguation-registry";
import {
  buildSelfProvidedCandidate,
  lookupPersonCandidatesFromEncyclopedia,
  resolveEncyclopediaCandidate,
} from "@/lib/search/lookup-person-encyclopedia";
import { parsePersonQuery, pickAutoConfirmCandidateId } from "@/lib/search/parse-person-query";
import type { ResearchProgressCallback, ResearchBundle } from "@/lib/search/research-types";
import {
  saveKnowledgeSnapshots,
  linkSnapshotsToEntity,
} from "@/lib/services/knowledge-snapshot";
import { checkContentRisk } from "@/lib/compliance/risk-check";
import type { EntityType, EntityProfileContent } from "@/lib/schemas/entity";

export async function ensureUniqueEntitySlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let i = 1;
  while (await prisma.entity.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${i}`;
    i++;
  }
  return slug;
}

export class PersonDisambiguationRequiredError extends Error {
  personName: string;
  reason: string;
  candidates: Array<{
    id: string;
    label: string;
    title?: string;
    company?: string;
    snippet: string;
    url?: string;
    region?: string;
    source?: string;
    summary?: string;
    confidence?: number;
  }>;
  allowCompare: boolean;

  constructor(
    personName: string,
    reason: string,
    candidates: PersonDisambiguationRequiredError["candidates"],
    allowCompare: boolean,
  ) {
    super(reason);
    this.personName = personName;
    this.reason = reason;
    this.candidates = candidates;
    this.allowCompare = allowCompare;
  }
}

export async function generateAndSaveEntity(
  name: string,
  options: {
    entityType?: string;
    subtype?: string;
    fetchNews?: boolean;
    generateReport?: boolean;
    publish?: boolean;
    onResearchProgress?: ResearchProgressCallback;
    visibility?: string;
    isFeatured?: boolean;
    isOfficial?: boolean;
    confirmedCandidateId?: string;
    /** 人物单位线索，用于百科消歧 */
    companyHint?: string;
    ownerUserId?: string;
    /** 设为 true 时使用旧版单 Prompt 流水线（默认走五段生产流水线） */
    useLegacyPipeline?: boolean;
    pipelineJobId?: string;
    pipelineItemId?: string;
    onPipelineEvent?: (event: PipelineStreamEvent) => void;
  } = {},
) {
  if (!options.useLegacyPipeline) {
    try {
      const result = await runProductionPipeline(
        {
          name,
          entityType: options.entityType,
          subtype: options.subtype,
          confirmedCandidateId: options.confirmedCandidateId,
          companyHint: options.companyHint,
          fetchNews: options.fetchNews,
          generateReport: options.generateReport,
          publish: options.publish,
          visibility: options.visibility,
          isFeatured: options.isFeatured,
          isOfficial: options.isOfficial,
          ownerUserId: options.ownerUserId,
        },
        {
          jobId: options.pipelineJobId,
          itemId: options.pipelineItemId,
          onEvent: (event: PipelineStreamEvent) => {
            options.onPipelineEvent?.(event);
            if (event.type === "status" && event.data.message) {
              options.onResearchProgress?.({
                phase: mapStageToPhase(event.stage),
                label: String(event.data.message),
                detail: event.data.detail ? String(event.data.detail) : undefined,
                status: "running",
              });
            }
          },
        },
      );
      return prisma.entity.findUniqueOrThrow({
        where: { id: result.entityId },
        include: { profile: true },
      });
    } catch (err) {
      if (err instanceof PipelineLockError) {
        throw new PersonDisambiguationRequiredError(
          err.personName,
          err.reason,
          err.candidates,
          err.allowCompare,
        );
      }
      throw err;
    }
  }

  const detected = detectEntityType(name, options.entityType);
  const type = detected.type;
  const subtype = options.subtype || detected.subtype;

  if (type === "person" && !options.confirmedCandidateId) {
    const parsed = parsePersonQuery(name, options.companyHint);
    const lookup = await lookupPersonCandidatesFromEncyclopedia(parsed.displayName, {
      companyHint: parsed.companyHint,
    });
    const autoId = pickAutoConfirmCandidateId(
      lookup.candidates,
      parsed.personName,
      parsed.companyHint,
    );
    if (autoId) {
      return generateAndSaveEntity(name, { ...options, confirmedCandidateId: autoId });
    }
    throw new PersonDisambiguationRequiredError(
      parsed.displayName,
      lookup.reason,
      lookup.candidates.length > 0
        ? lookup.candidates.map(({ id, label, title, company, snippet, url, region, source, summary, confidence }) => ({
            id,
            label,
            title,
            company,
            snippet,
            url,
            region,
            source,
            summary,
            confidence,
          }))
        : [buildSelfProvidedCandidate(parsed.personName, parsed.displayName)],
      lookup.allowCompare,
    );
  }

  const resolved = options.confirmedCandidateId
    ? await resolveEncyclopediaCandidate(name, options.confirmedCandidateId)
    : null;
  const registryCandidate =
    resolved?.registryCandidate ||
    (options.confirmedCandidateId
      ? resolveRegistryCandidate(name, options.confirmedCandidateId)
      : null);

  let research: ResearchBundle & { baike?: import("@/lib/search/baike-fetcher").EnrichedSource | null };
  if (type === "person") {
    const factBundle = await fetchPersonFacts({
      name,
      identityHint: resolved?.identityHint || registryCandidate?.identityHint || "",
      registryCandidate,
      confirmedBaikeUrl: resolved?.baikeUrl,
      confirmedWikiUrl: resolved?.wikiUrl,
      onStep: (s) =>
        options.onResearchProgress?.({
          phase: s.phase === "fetch" ? "baike" : "search",
          label: s.label,
          detail: s.detail,
          status: s.status,
        }),
    });
    const personContext = formatFactBundleForIntegration(factBundle);
    research = {
      news: [],
      webResults: [],
      baikeEntries: factBundle.baikeEntries,
      wiki: factBundle.wiki,
      webCrawlPages: factBundle.webCrawlPages,
      pageExcerpts: factBundle.webCrawlPages,
      contextText: personContext,
      sourceCount: factBundle.sourceCount,
      steps: factBundle.steps.map((s) => ({
        phase: s.phase === "fetch" ? "baike" : "search",
        label: s.label,
        detail: s.detail,
        status: s.status,
      })),
      baike: factBundle.baikeEntries[0] || null,
    };
  } else {
    research = await gatherEntityResearch(name, type, {
      fetchNews: options.fetchNews !== false,
      webSearch: true,
      onProgress: options.onResearchProgress,
    });
  }

  const personBaikeOnly =
    type === "person" &&
    (research.baikeEntries.length > 0 || Boolean(research.wiki?.fullText));
  const cityBaikeOnly =
    type === "city" &&
    (research.baikeEntries.length > 0 || Boolean(research.wiki?.fullText));
  const baikeOnly = personBaikeOnly || cityBaikeOnly;
  const aiContext =
    type === "person"
      ? research.contextText
      : type === "city" && cityBaikeOnly
        ? buildBaikeOnlyContext(research.baikeEntries, research.wiki)
        : research.contextText;

  const realNews = filterRealNews(research.news);

  const generated = await generateEntityContent(
    name,
    type,
    subtype,
    baikeOnly ? [] : realNews,
    aiContext,
    research.webResults,
    {
      baikeOnly,
      identityHint: registryCandidate?.identityHint,
    },
  );
  const slug = await ensureUniqueEntitySlug(generated.slug || entitySlug(name));

  const fullContent = JSON.stringify({
    sections: generated.sections,
    tags: generated.tags,
    keywords: generated.keywords,
  } satisfies EntityProfileContent);

  const risk = checkContentRisk(
    fullContent + generated.summary,
    type,
    subtype,
  );

  const sourcesToSave = dedupeSources([
    ...(generated.sources || []),
    ...(research.webCrawlPages || []).map((page) => ({
      title: page.title,
      url: page.url,
      source_type: page.sourceType === "gov" ? "official" as const : "web" as const,
      excerpt: page.fullText?.slice(0, 500) || page.snippet,
      confidence_score: page.confidenceScore ?? 0.75,
    })),
    ...research.baikeEntries.map((baike) => ({
      title: baike.title,
      url: baike.url,
      source_type: "wiki" as const,
      excerpt: baike.fullText?.slice(0, 800) || baike.snippet,
      confidence_score: 0.95,
    })),
    ...(research.wiki
      ? [{
          title: research.wiki.title,
          url: research.wiki.url,
          source_type: "wiki" as const,
          excerpt: research.wiki.fullText?.slice(0, 800) || research.wiki.snippet,
          confidence_score: 0.92,
        }]
      : []),
    ...(research.pageExcerpts || []).map((page) => ({
      title: page.title,
      url: page.url,
      source_type: page.sourceType === "gov" ? "official" as const : "web" as const,
      excerpt: page.fullText?.slice(0, 500) || page.snippet,
      confidence_score: page.confidenceScore,
    })),
  ]).slice(0, 8);

  let famousMedia: Awaited<ReturnType<typeof gatherFamousPersonMedia>> = null;
  let cityMedia: Awaited<ReturnType<typeof gatherCityMedia>> = null;
  if (type === "person") {
    famousMedia =
      (await gatherFamousPersonMedia(name, research)) ||
      (await gatherPersonMediaFallback(name, {
        identityHint: options.companyHint || options.confirmedCandidateId,
        summary: research.contextText?.slice(0, 400),
      }));
  } else if (type === "city") {
    cityMedia = await gatherCityMedia(name, research);
  }

  const coverUrl = famousMedia?.coverUrl ?? cityMedia?.coverUrl;
  const avatarUrl = famousMedia?.avatarUrl ?? cityMedia?.coverUrl;
  const galleryImages = famousMedia?.galleryImages.length
    ? famousMedia.galleryImages
    : cityMedia?.galleryImages ?? [];

  const entity = await prisma.entity.create({
    data: {
      type,
      name: generated.name,
      slug,
      subtype: subtype || generated.subtype,
      status: risk.passed
        ? options.publish !== false
          ? "published"
          : "pending_review"
        : "pending_review",
      isAiGenerated: true,
      isOfficial: options.isOfficial !== false,
      visibility: options.visibility || "public",
      isFeatured: options.isFeatured ?? false,
      profile: {
        create: {
          title: generated.title,
          subtitle: generated.subtitle,
          summary: generated.summary,
          slogan: generated.slogan,
          contentJson: fullContent,
          seoTitle: generated.seo_title,
          seoDescription: generated.seo_description,
          theme: generated.theme,
          avatarUrl,
          coverUrl,
        },
      },
      mediaAssets: galleryImages.length
        ? {
            create: galleryImages.map((img, i) => ({
              url: img.url,
              type: img.type,
              title: img.title,
              sortOrder: i,
            })),
          }
        : undefined,
      videoLinks: famousMedia?.videos.length
        ? {
            create: famousMedia.videos.map((video, i) => ({
              platform: video.platform,
              url: video.url,
              title: video.title,
              coverUrl: video.coverUrl,
              embedUrl: video.embedUrl,
              canEmbed: video.canEmbed,
              sortOrder: i,
            })),
          }
        : undefined,
      sources: {
        create: sourcesToSave.map((s) => ({
          sourceType: s.source_type,
          title: s.title,
          url: s.url,
          excerpt: s.excerpt,
          confidenceScore: s.confidence_score,
        })),
      },
      newsArticles: {
        create: realNews.slice(0, 6).map((n) => ({
          title: n.title,
          url: n.url,
          source: n.source,
          publishedAt: n.publishedAt,
          excerpt: n.excerpt,
        })),
      },
      auditLogs: {
        create: {
          action: "ai_generated",
          details: `AIç”Ÿæˆ${type}æ¡£æ¡ˆ`,
          riskFlags: risk.flags.length ? JSON.stringify(risk.flags) : null,
        },
      },
    },
    include: { profile: true },
  });

  const snapshotSources = [
    ...(research.webCrawlPages || []),
    ...research.baikeEntries,
    ...(research.wiki ? [research.wiki] : []),
    ...(research.pageExcerpts || []).filter(
      (p) => !(research.webCrawlPages || []).some((w) => w.url === p.url),
    ),
  ];
  if (snapshotSources.length) {
    await saveKnowledgeSnapshots({
      entityId: entity.id,
      entityName: generated.name,
      entityType: type,
      sources: snapshotSources,
    });
    await linkSnapshotsToEntity(generated.name, type, entity.id);
  }

  if (generated.relations?.length) {
    for (const rel of generated.relations) {
      const targetSlug = entitySlug(rel.target_name);
      let target = await prisma.entity.findFirst({
        where: { OR: [{ slug: targetSlug }, { name: rel.target_name }] },
      });

      if (!target) {
        target = await prisma.entity.create({
          data: {
            type: rel.target_type,
            name: rel.target_name,
            slug: await ensureUniqueEntitySlug(targetSlug),
            status: "draft",
            isAiGenerated: true,
            profile: {
              create: {
                title: rel.target_name,
                summary: "å…³è”å®žä½“ï¼Œå¾…å®Œå–„",
                contentJson: JSON.stringify({ sections: [], tags: [], keywords: [] }),
              },
            },
          },
        });
      }

      await prisma.entityRelation.create({
        data: {
          fromEntityId: entity.id,
          toEntityId: target.id,
          relationType: rel.relation_type,
          label: rel.label,
        },
      }).catch(() => {});
    }
  }

  if (options.generateReport !== false) {
    const reportResearchContext = type === "person" ? aiContext : research.contextText;
    const report = await generateReportContent(
      name,
      type,
      generated.summary,
      type === "person" ? [] : research.news,
      reportResearchContext,
      {
        identityHint:
          registryCandidate?.identityHint ||
          resolved?.identityHint ||
          undefined,
      },
    );

    await prisma.entityReport.create({
      data: {
        entityId: entity.id,
        reportType: type === "city" ? "city" : type === "person" ? "person_ip" : "brand",
        title: report.title,
        summary: report.summary,
        contentJson: JSON.stringify({
          steps: report.steps,
          sections: report.sections,
          segments: report.segments,
          segment_dimensions: report.segment_dimensions,
          recommendations: report.recommendations,
          training_points: report.training_points,
          brand_slogan_analysis: report.brand_slogan_analysis,
          one_line_positioning: report.one_line_positioning,
        }),
        scoreJson: JSON.stringify({
          scores: report.scores,
          overall: report.overall_score,
        }),
      },
    });
  }

  return entity;
}

export type { ResearchProgressCallback };

function mapStageToPhase(stage?: string): import("@/lib/search/research-types").ResearchStep["phase"] {
  if (stage === "fetch" || stage === "search") return "search";
  if (stage === "evidence") return "merge";
  if (stage === "writing") return "ai";
  if (stage === "media") return "page";
  return "ai";
}

export async function getEntityBySlug(slug: string) {
  return prisma.entity.findUnique({
    where: { slug },
    include: {
      profile: true,
      reports: { orderBy: { createdAt: "desc" } },
      sources: { orderBy: { createdAt: "desc" } },
      newsArticles: { orderBy: { createdAt: "desc" }, take: 10 },
      mediaAssets: { orderBy: { sortOrder: "asc" } },
      videoLinks: { orderBy: { sortOrder: "asc" } },
      relationsFrom: {
        include: { toEntity: { include: { profile: true } } },
      },
      relationsTo: {
        include: { fromEntity: { include: { profile: true } } },
      },
    },
  });
}

export async function getEntitiesByType(type: EntityType, limit = 100) {
  const { getPublicEntitiesByType } = await import("@/lib/services/content-visibility");
  return getPublicEntitiesByType(type, limit);
}

/** @deprecated use getFeaturedEntitiesByType on homepage */
export async function getFeaturedByType(type: EntityType, limit = 12) {
  const { getFeaturedEntitiesByType } = await import("@/lib/services/content-visibility");
  return getFeaturedEntitiesByType(type, limit);
}

export async function getNewEntityIdsFromBatchJob(jobId: string): Promise<string[]> {
  const items = await prisma.generationJobItem.findMany({
    where: { jobId, status: "completed", entityId: { not: null } },
    select: { entityId: true },
  });
  return items.map((i) => i.entityId!).filter(Boolean);
}

export async function getEntityReport(entityId: string, reportType?: string) {
  return prisma.entityReport.findFirst({
    where: { entityId, ...(reportType ? { reportType } : {}) },
    orderBy: { createdAt: "desc" },
  });
}

