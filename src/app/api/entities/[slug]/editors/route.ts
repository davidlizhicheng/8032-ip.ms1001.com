import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authErrorResponse, requireAdmin, requireAuth } from "@/lib/auth/require-auth";
import { canEditEntity } from "@/lib/services/entity-permissions";

type Params = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const ctx = await requireAuth(request);
    const { slug } = await params;
    const entity = await prisma.entity.findUnique({ where: { slug }, select: { id: true, ownerUserId: true } });
    if (!entity) return NextResponse.json({ error: "未找到页面" }, { status: 404 });
    if (!(await canEditEntity(entity.id, ctx))) {
      return NextResponse.json({ error: "无权查看授权名单" }, { status: 403 });
    }
    const [owner, editors] = await Promise.all([
      entity.ownerUserId
        ? prisma.user.findUnique({
            where: { id: entity.ownerUserId },
            select: { id: true, displayName: true, unifiedUsername: true, email: true, phone: true },
          })
        : null,
      prisma.entityEditor.findMany({
        where: { entityId: entity.id },
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, displayName: true, unifiedUsername: true, email: true, phone: true } } },
      }),
    ]);
    return NextResponse.json({ owner, editors });
  } catch (error) {
    return authErrorResponse(error);
  }
}

const GrantSchema = z.object({
  username: z.string().min(1),
  role: z.enum(["editor", "owner_delegate"]).default("editor"),
});

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const ctx = await requireAdmin(request);
    const input = GrantSchema.parse(await request.json());
    const { slug } = await params;
    const entity = await prisma.entity.findUnique({ where: { slug }, select: { id: true } });
    if (!entity) return NextResponse.json({ error: "未找到页面" }, { status: 404 });
    const key = input.username.trim();
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { unifiedUsername: key },
          { email: key },
          { phone: key },
          { displayName: key },
        ],
      },
    });
    if (!user) return NextResponse.json({ error: "未找到该用户，请确认对方已登录过全球品牌创新名片网" }, { status: 404 });
    const editor = await prisma.entityEditor.upsert({
      where: { entityId_userId: { entityId: entity.id, userId: user.id } },
      update: { role: input.role, grantedBy: ctx.user.id },
      create: { entityId: entity.id, userId: user.id, role: input.role, grantedBy: ctx.user.id },
      include: { user: { select: { id: true, displayName: true, unifiedUsername: true, email: true, phone: true } } },
    });
    await prisma.contentRevision.create({
      data: {
        entityId: entity.id,
        userId: ctx.user.id,
        action: "grant_editor",
        afterJson: JSON.stringify({ editorUserId: user.id, role: input.role }),
        note: `授权 ${key} 编辑`,
      },
    });
    return NextResponse.json({ success: true, editor });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    return authErrorResponse(error);
  }
}
