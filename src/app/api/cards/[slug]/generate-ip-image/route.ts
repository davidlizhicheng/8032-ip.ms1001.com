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

    const card = await prisma.card.findUnique({ where: { slug } });
    if (!card) {
      return NextResponse.json({ error: "名片不存在" }, { status: 404 });
    }

    const { url, prompt } = await generateIpImage({
      name: card.name,
      entityType: "person",
      summary: card.bio || card.brandSlogan || undefined,
    });

    const asset = await prisma.mediaAsset.create({
      data: {
        cardId: card.id,
        url,
        type: body.target === "gallery" ? "gallery" : body.target,
        title: "AI 品牌 IP 图",
        sortOrder: Date.now(),
      },
    });

    if (body.target === "cover") {
      await prisma.card.update({ where: { id: card.id }, data: { coverUrl: url } });
    }
    if (body.target === "avatar") {
      await prisma.card.update({ where: { id: card.id }, data: { avatarUrl: url } });
    }

    return NextResponse.json({ success: true, asset, url });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return authErrorResponse(error);
  }
}
