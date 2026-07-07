import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authErrorResponse, optionalAuth, requireAdmin } from "@/lib/auth/require-auth";
import { adminListCards, adminListContent, withdrawAllEntities } from "@/lib/services/content-visibility";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const type = request.nextUrl.searchParams.get("type") || undefined;
    const [entities, cards] = await Promise.all([
      adminListContent(type || undefined),
      adminListCards(),
    ]);
    return NextResponse.json({ entities, cards });
  } catch (error) {
    return authErrorResponse(error);
  }
}

const PatchSchema = z.object({
  kind: z.enum(["entity", "card"]),
  id: z.string(),
  visibility: z.enum(["private", "public", "admin_hidden"]).optional(),
  isFeatured: z.boolean().optional(),
  manualRankOrder: z.number().int().min(1).max(9999).nullable().optional(),
  verificationStatus: z.enum(["pending_review", "approved", "rejected"]).optional(),
  // 管理员可改 AI 生成内容
  name: z.string().min(1).optional(),
  title: z.string().nullable().optional(),
  subtitle: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  slogan: z.string().nullable().optional(),
  contentJson: z.string().optional(),
  bio: z.string().nullable().optional(),
  brandSlogan: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin(request);
    const body = PatchSchema.parse(await request.json());

    if (body.kind === "entity") {
      if (body.contentJson) JSON.parse(body.contentJson);
      const updated = await prisma.$transaction(async (tx) => {
        const entity = await tx.entity.update({
          where: { id: body.id },
          data: {
            ...(body.visibility !== undefined ? { visibility: body.visibility } : {}),
            ...(body.isFeatured !== undefined ? { isFeatured: body.isFeatured } : {}),
            ...(body.manualRankOrder !== undefined ? { manualRankOrder: body.manualRankOrder } : {}),
            ...(body.name !== undefined ? { name: body.name } : {}),
          },
        });
        if (
          body.title !== undefined ||
          body.subtitle !== undefined ||
          body.summary !== undefined ||
          body.slogan !== undefined ||
          body.contentJson !== undefined
        ) {
          await tx.entityProfile.updateMany({
            where: { entityId: body.id },
            data: {
              ...(body.title !== undefined ? { title: body.title } : {}),
              ...(body.subtitle !== undefined ? { subtitle: body.subtitle } : {}),
              ...(body.summary !== undefined ? { summary: body.summary } : {}),
              ...(body.slogan !== undefined ? { slogan: body.slogan } : {}),
              ...(body.contentJson !== undefined ? { contentJson: body.contentJson } : {}),
            },
          });
        }
        return entity;
      });
      return NextResponse.json({ success: true, item: updated });
    }

    if (body.verificationStatus) {
      const existingSection = await prisma.cardSection.findFirst({
        where: { cardId: body.id, type: "verification" },
      });
      const content = JSON.stringify({
        status: body.verificationStatus,
        method: "admin_review",
        account: "",
        proofCount: 0,
        note: "首次已由管理员确认；确认后本人可维护名片内容。网站展示认证状态与免责申明，不代替工商或官方认证。",
      });
      if (existingSection) {
        let parsed: Record<string, unknown> = {};
        try {
          parsed = JSON.parse(existingSection.content) as Record<string, unknown>;
        } catch {
          parsed = {};
        }
        await prisma.cardSection.update({
          where: { id: existingSection.id },
          data: { content: JSON.stringify({ ...parsed, status: body.verificationStatus }) },
        });
      } else {
        await prisma.cardSection.create({
          data: {
            cardId: body.id,
            type: "verification",
            title: "认证材料",
            content,
            sortOrder: 999,
          },
        });
      }
    }

    const updated = await prisma.card.update({
      where: { id: body.id },
      data: {
        ...(body.visibility !== undefined ? { visibility: body.visibility } : {}),
        ...(body.isFeatured !== undefined ? { isFeatured: body.isFeatured } : {}),
        ...(body.manualRankOrder !== undefined ? { manualRankOrder: body.manualRankOrder } : {}),
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.company !== undefined ? { company: body.company } : {}),
        ...(body.bio !== undefined ? { bio: body.bio } : {}),
        ...(body.brandSlogan !== undefined ? { brandSlogan: body.brandSlogan } : {}),
      },
    });
    return NextResponse.json({ success: true, item: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "内容 JSON 格式不正确" }, { status: 400 });
    }
    return authErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const action = request.nextUrl.searchParams.get("action");
    if (action === "withdraw-all") {
      const count = await withdrawAllEntities();
      return NextResponse.json({ success: true, withdrawn: count });
    }
    return NextResponse.json({ error: "未知操作" }, { status: 400 });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/** 非管理员可探测是否 ADMIN（用于 UI） */
export async function HEAD(request: NextRequest) {
  const ctx = await optionalAuth(request);
  return new NextResponse(null, {
    status: ctx?.suatUser.role === "ADMIN" ? 200 : 403,
  });
}
