import { prisma } from "@/lib/prisma";
import { entitySlug } from "@/lib/ai/detect-type";
import { checkContentRisk } from "@/lib/compliance/risk-check";
import { dedupeSources } from "@/lib/search/source-dedupe";
import { saveKnowledgeSnapshots, linkSnapshotsToEntity } from "@/lib/services/knowledge-snapshot";
import type { EntityProfileContent } from "@/lib/schemas/entity";
import type {
  EntityLockResult,
  EvidencePack,
  MediaMatchResult,
  PipelineContext,
  ProductionPipelineInput,
  ProductionPipelineResult,
} from "@/lib/agents/types";
import { lockEntity, EntityLockRequiredError } from "@/lib/agents/entity-lock";
import { runResearchAgent } from "@/lib/agents/research-agent";
import { runEvidenceAgent } from "@/lib/agents/evidence-agent";
import { runWritingAgent } from "@/lib/agents/writing-agent";
import { runMediaAgent } from "@/lib/agents/media-agent";
import { supplementEvidenceFromGaps, mergeEvidencePacks } from "@/lib/agents/gap-fill-research";
import { createStreamEmitter } from "@/lib/agents/stream-events";
import type { EnrichedSource } from "@/lib/search/baike-fetcher";

export { EntityLockRequiredError };

async function persistEntity(
  lock: EntityLockResult,
  evidence: EvidencePack,
  writing: Awaited<ReturnType<typeof runWritingAgent>>,
  media: MediaMatchResult,
  options: ProductionPipelineInput,
) {
  const generated = writing.entity;
  const type = lock.type;
  const subtype = lock.subtype;
  const baseSlug = generated.slug || entitySlug(lock.name);
  const existing = await prisma.entity.findFirst({
    where: {
      type,
      OR: [{ slug: baseSlug }, { name: generated.name }, { name: lock.name }],
    },
    include: { profile: true },
  });
  const slug = existing?.slug || baseSlug;

  const fullContent = JSON.stringify({
    sections: generated.sections,
    tags: generated.tags,
    keywords: generated.keywords,
  } satisfies EntityProfileContent);

  const risk = checkContentRisk(fullContent + generated.summary, type, subtype);

  const sourcesToSave = dedupeSources([
    ...(generated.sources || []),
    ...evidence.sources.map((s) => ({
      title: s.title,
      url: s.url,
      source_type:
        s.sourceType === "gov"
          ? ("official" as const)
          : s.sourceType === "baike" || s.sourceType === "wiki"
            ? ("wiki" as const)
            : ("web" as const),
      excerpt: s.text.slice(0, 500),
      confidence_score: s.qualityScore,
    })),
  ]).slice(0, 12);

  const entityData = {
      type,
      name: generated.name,
      slug,
      subtype: subtype || generated.subtype,
      ownerUserId: options.ownerUserId,
      status: risk.passed
        ? options.publish !== false
          ? "published"
          : "pending_review"
        : "pending_review",
      isAiGenerated: true,
      isOfficial: options.isOfficial ?? !options.ownerUserId,
      visibility: options.visibility ?? existing?.visibility ?? (options.ownerUserId ? "private" : "public"),
      isFeatured: options.isFeatured ?? existing?.isFeatured ?? false,
    };

  const profileData = {
    title: generated.title,
    subtitle: generated.subtitle,
    summary: generated.summary,
    slogan: generated.slogan,
    contentJson: fullContent,
    seoTitle: generated.seo_title,
    seoDescription: generated.seo_description,
    theme: generated.theme,
    avatarUrl: media.avatarUrl,
    coverUrl: media.coverUrl,
  };

  const entity = existing
    ? await prisma.entity.update({
        where: { id: existing.id },
        data: {
          ...entityData,
          updatedAt: new Date(),
          profile: {
            upsert: {
              create: profileData,
              update: profileData,
            },
          },
          mediaAssets: {
            deleteMany: {},
            create: media.galleryImages.map((img, i) => ({
              url: img.url,
              type: img.type,
              title: img.title,
              sortOrder: i,
            })),
          },
          videoLinks: {
            deleteMany: {},
            create: media.videos.map((video, i) => ({
              platform: video.platform,
              url: video.url,
              title: video.title,
              coverUrl: video.coverUrl,
              embedUrl: video.embedUrl,
              canEmbed: video.canEmbed,
              sortOrder: i,
            })),
          },
          sources: {
            deleteMany: {},
            create: sourcesToSave.map((s) => ({
              sourceType: s.source_type,
              title: s.title,
              url: s.url,
              excerpt: s.excerpt,
              confidenceScore: s.confidence_score,
            })),
          },
          auditLogs: {
            create: {
              action: "production_pipeline_update",
              details: `同名更新：证据 ${evidence.sources.length} 条，高质量 ${evidence.highQualityCount} 条`,
              riskFlags: risk.flags.length ? JSON.stringify(risk.flags) : null,
            },
          },
        },
        include: { profile: true },
      })
    : await prisma.entity.create({
        data: {
          ...entityData,
          profile: { create: profileData },
          mediaAssets: media.galleryImages.length
            ? {
                create: media.galleryImages.map((img, i) => ({
                  url: img.url,
                  type: img.type,
                  title: img.title,
                  sortOrder: i,
                })),
              }
            : undefined,
          videoLinks: media.videos.length
            ? {
                create: media.videos.map((video, i) => ({
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
          auditLogs: {
            create: {
              action: "production_pipeline",
              details: `五段流水线生成：证据 ${evidence.sources.length} 条，高质量 ${evidence.highQualityCount} 条`,
              riskFlags: risk.flags.length ? JSON.stringify(risk.flags) : null,
            },
          },
        },
        include: { profile: true },
      });

  const snapshotSources: EnrichedSource[] = evidence.sources.map((s) => ({
    title: s.title,
    url: s.url,
    snippet: s.text.slice(0, 400),
    fullText: s.text,
    source: s.sourceType,
    provider: "evidence-pack",
    sourceType:
      s.sourceType === "wiki"
        ? "wiki"
        : s.sourceType === "baike"
          ? "baike"
          : s.sourceType === "gov"
            ? "gov"
            : "web",
    confidenceScore: s.qualityScore,
  }));

  if (snapshotSources.length) {
    await saveKnowledgeSnapshots({
      entityId: entity.id,
      entityName: generated.name,
      entityType: type,
      sources: snapshotSources,
    });
    await linkSnapshotsToEntity(generated.name, type, entity.id);
  }

  if (writing.report) {
    const report = writing.report;
    const reportType = type === "city" ? "city" : type === "person" ? "person_ip" : "brand";
    const reportPayload = {
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
    };
    const latestReport = await prisma.entityReport.findFirst({
      where: { entityId: entity.id, reportType },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (latestReport) {
      await prisma.entityReport.update({
        where: { id: latestReport.id },
        data: reportPayload,
      });
    } else {
      await prisma.entityReport.create({
        data: {
          entityId: entity.id,
          reportType,
          ...reportPayload,
        },
      });
    }
  }

  return entity;
}

/**
 * 生产流水线：Research → Evidence → Writing → Media → Save
 * 批量与单条生成共用此入口。
 */
export async function runProductionPipeline(
  input: ProductionPipelineInput,
  ctx: PipelineContext = {},
): Promise<ProductionPipelineResult> {
  const stream = createStreamEmitter(ctx);

  const lock = await lockEntity(
    input.name,
    {
      entityType: input.entityType,
      confirmedCandidateId: input.confirmedCandidateId,
      companyHint: input.companyHint,
    },
    ctx,
  );

  const raw = await runResearchAgent(lock, ctx);
  let evidence = runEvidenceAgent(lock, raw, ctx);

  if (!evidence.readyForWriting || evidence.gaps.length > 0) {
    stream.status("触发 Gap Check 自动补搜…", "gap_check", { gaps: evidence.gaps });
    const added = await supplementEvidenceFromGaps(lock, evidence, ctx);
    if (added.length) {
      evidence = mergeEvidencePacks(evidence, added);
      stream.status(
        `补搜后证据：${evidence.sources.length} 条，高质量 ${evidence.highQualityCount} 条`,
        "evidence",
      );
    }
  }

  if (!evidence.readyForWriting) {
    stream.status(
      `证据仍不足（${evidence.highQualityCount}/5），将基于现有 ${evidence.sources.length} 条谨慎生成`,
      "gap_check",
    );
  }

  const writing = await runWritingAgent(
    lock,
    evidence,
    { fetchNews: input.fetchNews, generateReport: input.generateReport },
    ctx,
  );

  const media = await runMediaAgent(lock, evidence, ctx);

  stream.status("正在保存档案与知识快照…", "quality");
  const entity = await persistEntity(lock, evidence, writing, media, input);

  stream.done({
    entityId: entity.id,
    slug: entity.slug,
    name: entity.name,
    evidenceCount: evidence.sources.length,
    highQualityCount: evidence.highQualityCount,
  });

  return {
    entityId: entity.id,
    slug: entity.slug,
    name: entity.name,
    type: lock.type,
    evidencePack: evidence,
    reportGenerated: Boolean(writing.report),
  };
}
