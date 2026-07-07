import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authErrorResponse, requireAuth } from "@/lib/auth/require-auth";
import { canEditEntity } from "@/lib/services/entity-permissions";
import { generateReportContent } from "@/lib/ai/generate-entity";
import { fetchNewsForEntity, type NewsItem } from "@/lib/news/fetcher";
import { gatherEntityResearch } from "@/lib/search/gather-research";
import { gatherPersonResearchForCard } from "@/lib/search/gather-person-research";
import { pickPersonResearchContext } from "@/lib/search/baike-context";
import type { EntityType } from "@/lib/schemas/entity";

const Schema = z.object({
  entityId: z.string().optional(),
  slug: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireAuth(request);
    const body = await request.json();
    const { entityId, slug } = Schema.parse(body);

    const entity = await prisma.entity.findFirst({
      where: entityId ? { id: entityId } : { slug },
      include: { profile: true, newsArticles: true, sources: true },
    });

    if (!entity) {
      return NextResponse.json({ error: "实体不存在" }, { status: 404 });
    }
    if (!(await canEditEntity(entity.id, ctx))) {
      return NextResponse.json({ error: "只有管理员、页面拥有者或授权编辑者可以再次生成" }, { status: 403 });
    }

    const news: NewsItem[] = entity.newsArticles.map((n) => ({
      title: n.title,
      url: n.url,
      source: n.source || undefined,
      excerpt: n.excerpt || undefined,
    }));

    if (!news.length) {
      const fetched = await fetchNewsForEntity(entity.name, entity.type);
      news.push(...fetched);
    }

    let researchContext: string;
    let reportNews = news;
    let identityHint: string | undefined;

    if (entity.type === "person") {
      const baikeSource = entity.sources.find((s) => s.url?.includes("baike.baidu.com"));
      const wikiSource = entity.sources.find((s) => s.url?.includes("wikipedia.org"));
      const personResearch = await gatherPersonResearchForCard(entity.name, {
        confirmedBaikeUrl: baikeSource?.url ?? undefined,
        confirmedWikiUrl: wikiSource?.url ?? undefined,
        identityHint: entity.profile?.subtitle || undefined,
      });
      researchContext = pickPersonResearchContext({
        baikeEntries: personResearch.baikeEntries,
        wiki: personResearch.wiki,
        contextText: personResearch.contextText,
      });
      reportNews = [];
      identityHint = personResearch.identityHint || entity.profile?.subtitle || undefined;
    } else {
      const research = await gatherEntityResearch(entity.name, entity.type, {
        fetchNews: true,
      });
      researchContext = research.contextText;
    }

    const report = await generateReportContent(
      entity.name,
      entity.type as EntityType,
      entity.profile?.summary || undefined,
      reportNews,
      researchContext,
      { identityHint },
    );

    const savedReport = await prisma.entityReport.create({
      data: {
        entityId: entity.id,
        reportType:
          entity.type === "city" ? "city" : entity.type === "person" ? "person_ip" : "brand",
        title: report.title,
        summary: report.summary,
        contentJson: JSON.stringify({
          steps: report.steps,
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
    await prisma.contentRevision.create({
      data: {
        entityId: entity.id,
        userId: ctx.user.id,
        action: "regenerate_report",
        afterJson: JSON.stringify({ reportId: savedReport.id, title: savedReport.title }),
        note: "再次生成报告；不覆盖页面人工编辑内容",
      },
    });

    return NextResponse.json({
      success: true,
      title: report.title,
      stepsCount: report.steps?.length || 0,
      overallScore: report.overall_score,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return authErrorResponse(error);
  }
}
