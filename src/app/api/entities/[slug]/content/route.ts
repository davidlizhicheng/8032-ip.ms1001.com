import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authErrorResponse, requireAuth } from "@/lib/auth/require-auth";
import { canEditEntity, snapshotEntity } from "@/lib/services/entity-permissions";

type Params = { params: Promise<{ slug: string }> };

const PatchSchema = z.object({
  name: z.string().min(1).optional(),
  title: z.string().nullable().optional(),
  subtitle: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  slogan: z.string().nullable().optional(),
  contentJson: z.string().optional(),
  seoTitle: z.string().nullable().optional(),
  seoDescription: z.string().nullable().optional(),
  theme: z.string().optional(),
  coverUrl: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  visibility: z.enum(["private", "public", "admin_hidden"]).optional(),
  status: z.string().optional(),
  isFeatured: z.boolean().optional(),
  manualRankOrder: z.number().int().min(1).max(9999).nullable().optional(),
  note: z.string().optional(),
});

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const ctx = await requireAuth(request);
    const { slug } = await params;
    const entity = await prisma.entity.findUnique({ where: { slug }, include: { profile: true } });
    if (!entity) return NextResponse.json({ error: "未找到页面" }, { status: 404 });
    if (!(await canEditEntity(entity.id, ctx))) return NextResponse.json({ error: "无权编辑" }, { status: 403 });
    return NextResponse.json({ entity: snapshotEntity(entity), canEdit: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const ctx = await requireAuth(request);
    const input = PatchSchema.parse(await request.json());
    const { slug } = await params;
    const before = await prisma.entity.findUnique({ where: { slug }, include: { profile: true } });
    if (!before) return NextResponse.json({ error: "未找到页面" }, { status: 404 });
    if (!(await canEditEntity(before.id, ctx))) return NextResponse.json({ error: "无权编辑" }, { status: 403 });
    if (input.contentJson) {
      JSON.parse(input.contentJson);
    }
    const isAdmin = ctx.suatUser.role === "ADMIN";
    if (
      !isAdmin &&
      (input.visibility !== undefined ||
        input.status !== undefined ||
        input.isFeatured !== undefined ||
        input.manualRankOrder !== undefined)
    ) {
      return NextResponse.json({ error: "仅管理员可修改公开状态与排序" }, { status: 403 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const entity = await tx.entity.update({
        where: { id: before.id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(isAdmin && input.visibility !== undefined ? { visibility: input.visibility } : {}),
          ...(isAdmin && input.status !== undefined ? { status: input.status } : {}),
          ...(isAdmin && input.isFeatured !== undefined ? { isFeatured: input.isFeatured } : {}),
          ...(isAdmin && input.manualRankOrder !== undefined
            ? { manualRankOrder: input.manualRankOrder }
            : {}),
        },
        include: { profile: true },
      });
      if (before.profile) {
        await tx.entityProfile.update({
          where: { entityId: before.id },
          data: {
            ...(input.title !== undefined ? { title: input.title } : {}),
            ...(input.subtitle !== undefined ? { subtitle: input.subtitle } : {}),
            ...(input.summary !== undefined ? { summary: input.summary } : {}),
            ...(input.slogan !== undefined ? { slogan: input.slogan } : {}),
            ...(input.contentJson !== undefined ? { contentJson: input.contentJson } : {}),
            ...(input.seoTitle !== undefined ? { seoTitle: input.seoTitle } : {}),
            ...(input.seoDescription !== undefined ? { seoDescription: input.seoDescription } : {}),
            ...(input.theme !== undefined ? { theme: input.theme } : {}),
            ...(input.coverUrl !== undefined ? { coverUrl: input.coverUrl } : {}),
            ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
          },
        });
      }
      const after = await tx.entity.findUnique({ where: { id: before.id }, include: { profile: true } });
      await tx.contentRevision.create({
        data: {
          entityId: before.id,
          userId: ctx.user.id,
          action: "manual_edit",
          beforeJson: JSON.stringify(snapshotEntity(before)),
          afterJson: JSON.stringify(after ? snapshotEntity(after) : snapshotEntity(entity)),
          note: input.note || "页面可视化编辑",
        },
      });
      return after || entity;
    });
    return NextResponse.json({ success: true, entity: snapshotEntity(updated) });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    if (error instanceof SyntaxError) return NextResponse.json({ error: "内容 JSON 格式不正确" }, { status: 400 });
    return authErrorResponse(error);
  }
}
