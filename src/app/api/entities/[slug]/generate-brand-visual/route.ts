import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  generateBrandVisual,
  type BrandVisualTemplate,
} from "@/lib/ai/poster-image";
import {
  authErrorResponse,
  requireBrandUpgrade,
} from "@/lib/auth/require-auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ slug: string }> };

const bodySchema = z.object({
  template: z
    .enum([
      "brand-logo",
      "brand-poster",
      "product-poster",
      "ip-creative",
      "social-cover",
      "brand-event",
    ])
    .default("brand-poster"),
  target: z.enum(["cover", "avatar", "gallery", "logo"]).default("gallery"),
  userPrompt: z.string().max(300).optional(),
});

const MEDIA_TYPE: Record<string, string> = {
  "brand-logo": "logo",
  "brand-poster": "poster",
  "product-poster": "poster",
  "ip-creative": "cover",
  "social-cover": "poster",
  "brand-event": "poster",
};

export async function POST(request: NextRequest, { params }: Params) {
  try {
    await requireBrandUpgrade(request);
    const { slug } = await params;
    const body = bodySchema.parse(await request.json().catch(() => ({})));

    const entity = await prisma.entity.findUnique({
      where: { slug },
      include: { profile: true },
    });
    if (!entity) {
      return NextResponse.json({ error: "实体不存在" }, { status: 404 });
    }

    const { url, prompt, template } = await generateBrandVisual({
      template: body.template as BrandVisualTemplate,
      brandName: entity.name,
      entityType: entity.type,
      title: entity.profile?.title || entity.name,
      slogan: entity.profile?.slogan || undefined,
      summary: entity.profile?.summary || undefined,
      userPrompt: body.userPrompt,
    });

    const assetType =
      body.target === "logo"
        ? "logo"
        : body.target === "cover"
          ? "cover"
          : body.target === "avatar"
            ? "avatar"
            : MEDIA_TYPE[template] || "gallery";

    const asset = await prisma.mediaAsset.create({
      data: {
        entityId: entity.id,
        url,
        type: assetType,
        title: `AI ${template}`,
        sortOrder: Date.now(),
      },
    });

    if (body.target === "cover" && entity.profile) {
      await prisma.entityProfile.update({
        where: { entityId: entity.id },
        data: { coverUrl: url },
      });
    }
    if ((body.target === "avatar" || template === "brand-logo") && entity.profile) {
      await prisma.entityProfile.update({
        where: { entityId: entity.id },
        data: { avatarUrl: url },
      });
    }

    await prisma.auditLog.create({
      data: {
        entityId: entity.id,
        action: "ai_generate_brand_visual",
        details: `${template}: ${prompt.slice(0, 180)}`,
      },
    });

    return NextResponse.json({ success: true, asset, url, template, prompt });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return authErrorResponse(error);
  }
}
