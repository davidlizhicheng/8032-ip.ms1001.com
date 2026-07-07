import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateIpImage } from "@/lib/ai/fenno-image";
import {
  authErrorResponse,
  requireBrandUpgrade,
} from "@/lib/auth/require-auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ slug: string }> };

const bodySchema = z.object({
  target: z.enum(["cover", "avatar", "gallery"]).default("cover"),
});

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

    const { url, prompt } = await generateIpImage({
      name: entity.name,
      entityType: entity.type,
      summary: entity.profile?.summary || undefined,
    });

    const asset = await prisma.mediaAsset.create({
      data: {
        entityId: entity.id,
        url,
        type: body.target === "gallery" ? "gallery" : body.target,
        title: "AI 品牌 IP 图",
        sortOrder: Date.now(),
      },
    });

    if (body.target === "cover" && entity.profile) {
      await prisma.entityProfile.update({
        where: { entityId: entity.id },
        data: { coverUrl: url },
      });
    }
    if (body.target === "avatar" && entity.profile) {
      await prisma.entityProfile.update({
        where: { entityId: entity.id },
        data: { avatarUrl: url },
      });
    }

    await prisma.auditLog.create({
      data: {
        entityId: entity.id,
        action: "ai_generate_ip_image",
        details: prompt.slice(0, 200),
      },
    });

    return NextResponse.json({ success: true, asset, url });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return authErrorResponse(error);
  }
}
