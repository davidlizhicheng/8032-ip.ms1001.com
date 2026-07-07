import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { slug } = await params;
  const visitorKey = request.nextUrl.searchParams.get("visitorKey") || "";
  const entity = await prisma.entity.findUnique({
    where: { slug },
    select: { id: true, likeCount: true },
  });
  if (!entity) return NextResponse.json({ error: "未找到" }, { status: 404 });

  let liked = false;
  if (visitorKey.length >= 8) {
    const row = await prisma.entityLike.findUnique({
      where: {
        entityId_visitorKey: { entityId: entity.id, visitorKey },
      },
    });
    liked = Boolean(row);
  }

  return NextResponse.json({ likeCount: entity.likeCount, liked });
}

const LikeSchema = z.object({
  visitorKey: z.string().min(8).max(128),
  action: z.enum(["like", "unlike"]).default("like"),
});

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { slug } = await params;
    const body = LikeSchema.parse(await request.json());

    const entity = await prisma.entity.findUnique({ where: { slug } });
    if (!entity) return NextResponse.json({ error: "未找到" }, { status: 404 });

    const existing = await prisma.entityLike.findUnique({
      where: {
        entityId_visitorKey: { entityId: entity.id, visitorKey: body.visitorKey },
      },
    });

    if (body.action === "like" && !existing) {
      await prisma.$transaction([
        prisma.entityLike.create({
          data: { entityId: entity.id, visitorKey: body.visitorKey },
        }),
        prisma.entity.update({
          where: { id: entity.id },
          data: { likeCount: { increment: 1 } },
        }),
      ]);
    } else if (body.action === "unlike" && existing) {
      await prisma.$transaction([
        prisma.entityLike.delete({ where: { id: existing.id } }),
        prisma.entity.update({
          where: { id: entity.id },
          data: { likeCount: { decrement: 1 } },
        }),
      ]);
    }

    const updated = await prisma.entity.findUnique({
      where: { id: entity.id },
      select: { likeCount: true },
    });

    const liked = await prisma.entityLike.findUnique({
      where: {
        entityId_visitorKey: { entityId: entity.id, visitorKey: body.visitorKey },
      },
    });

    return NextResponse.json({
      likeCount: Math.max(0, updated?.likeCount ?? 0),
      liked: Boolean(liked),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "操作失败" },
      { status: 500 },
    );
  }
}
