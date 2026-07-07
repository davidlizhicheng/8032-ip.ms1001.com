import { prisma } from "@/lib/prisma";
import { entitySlug } from "@/lib/ai/detect-type";
import { ensureUniqueEntitySlug } from "@/lib/services/entity";
import { createCard } from "@/lib/services/card";
import { mergeContactIntoContentJson } from "@/lib/content/entity-contact";
import { generateReportContent } from "@/lib/ai/generate-entity";
import { entityPath, reportPath } from "@/lib/utils/entity-paths";
import type { EntityType } from "@/lib/schemas/entity";

export type SelfBrandInput = {
  ownerUserId: string;
  name: string;
  entityType: "person" | "company";
  title?: string;
  company?: string;
  brandSlogan?: string;
  bio: string;
  longBio?: string;
  phone?: string;
  email?: string;
  wechat?: string;
  address?: string;
  generateReport?: boolean;
};

export async function createSelfBrandPage(input: SelfBrandInput) {
  const name = input.name.trim();
  const bio = input.bio.trim();
  const longBio = (input.longBio || bio).trim();
  if (!name || bio.length < 20) {
    throw new Error("请填写名称和至少 20 字的自我介绍");
  }

  const type = input.entityType;
  const slug = await ensureUniqueEntitySlug(entitySlug(name));
  const summary = bio.slice(0, 400);
  const sections = [
    { type: "story", title: type === "company" ? "企业介绍" : "个人简介", content: longBio },
  ];
  if (input.brandSlogan?.trim()) {
    sections.push({ type: "business", title: "品牌定位", content: input.brandSlogan.trim() });
  }

  const contentJson = mergeContactIntoContentJson(
    JSON.stringify({
      sections,
      tags: ["自助入驻", type === "company" ? "企业名片" : "个人名片"],
      keywords: [name],
      selfProvided: true,
    }),
    {
      phone: input.phone,
      email: input.email,
      wechat: input.wechat,
      address: input.address,
    },
  );

  const entity = await prisma.entity.create({
    data: {
      type,
      name,
      slug,
      subtype: type === "person" ? "founder" : undefined,
      status: "published",
      isAiGenerated: true,
      isOfficial: false,
      isVerified: false,
      visibility: "private",
      ownerUserId: input.ownerUserId,
      profile: {
        create: {
          title: input.title?.trim() || name,
          subtitle: input.company?.trim() || (type === "company" ? "企业品牌名片" : undefined),
          summary,
          slogan: input.brandSlogan?.trim() || undefined,
          contentJson,
          seoTitle: `${name} | 全球品牌创新名片网`,
          seoDescription: summary,
          theme: type === "company" ? "brand_orange" : "brand_purple",
        },
      },
    },
    include: { profile: true },
  });

  const card = await createCard(
    {
      name,
      title: input.title,
      company: input.company,
      brandSlogan: input.brandSlogan,
      bio: summary,
      longBio,
      phone: input.phone,
      email: input.email,
      wechat: input.wechat,
      address: input.address,
      slug: `${slug}-card`,
      exchangeEnabled: true,
      theme: type === "company" ? "brand_orange" : "brand_purple",
    },
    input.ownerUserId,
  );

  let reportHref: string | undefined;
  if (input.generateReport !== false) {
    const report = await generateReportContent(
      name,
      type as EntityType,
      summary,
      [],
      `${longBio}\n\n【说明】本报告依据用户自助填写内容生成，可自行修改，不做知名度核验。`,
      { identityHint: input.company || "自助入驻" },
    );
    await prisma.entityReport.create({
      data: {
        entityId: entity.id,
        reportType: type === "person" ? "person_ip" : "brand",
        title: report.title,
        summary: report.summary,
        contentJson: JSON.stringify({
          steps: report.steps,
          sections: report.sections,
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
    reportHref = reportPath(type, slug);
  }

  return {
    entityId: entity.id,
    slug,
    entityHref: entityPath(type, slug),
    cardHref: `/u/${card.slug}`,
    reportHref,
    editHint: "内容已保存为私密，您可随时在档案页点击「编辑页面」自行修改。",
  };
}
