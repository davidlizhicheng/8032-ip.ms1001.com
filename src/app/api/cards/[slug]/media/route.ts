import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  AuthError,
  authErrorResponse,
  hasBrandUpgrade,
  optionalAuth,
} from "@/lib/auth/require-auth";

type Params = { params: Promise<{ slug: string }> };

async function ensureMultiUploadAllowed(cardId: string, request: NextRequest) {
  const galleryCount = await prisma.mediaAsset.count({
    where: { cardId, type: { in: ["gallery", "cover", "avatar", "poster", "case", "honor"] } },
  });
  if (galleryCount < 1) return;

  const ctx = await optionalAuth(request);
  if (!ctx) {
    throw new AuthError("多图上传需先登录并开通品牌升级", 401, "LOGIN_REQUIRED");
  }
  if (!hasBrandUpgrade(ctx.user, ctx.suatUser)) {
    throw new AuthError("多图上传需开通品牌升级（500元）", 402, "UPGRADE_REQUIRED");
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { slug } = await params;
    const card = await prisma.card.findUnique({ where: { slug } });
    if (!card) {
      return NextResponse.json({ error: "名片不存在" }, { status: 404 });
    }

    const body = await request.json();
    const input = z
      .object({
        imageUrl: z.string().url(),
        type: z.enum(["gallery", "cover", "avatar", "poster", "case", "honor"]).default("gallery"),
        title: z.string().optional(),
      })
      .parse(body);

    await ensureMultiUploadAllowed(card.id, request);

    const asset = await prisma.mediaAsset.create({
      data: {
        cardId: card.id,
        url: input.imageUrl,
        type: input.type,
        title: input.title,
        sortOrder: Date.now(),
      },
    });

    if (input.type === "cover") {
      await prisma.card.update({ where: { id: card.id }, data: { coverUrl: input.imageUrl } });
    }
    if (input.type === "avatar") {
      await prisma.card.update({ where: { id: card.id }, data: { avatarUrl: input.imageUrl } });
    }

    return NextResponse.json({ success: true, asset });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    if (error instanceof AuthError) {
      return authErrorResponse(error);
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "上传失败" },
      { status: 500 },
    );
  }
}
