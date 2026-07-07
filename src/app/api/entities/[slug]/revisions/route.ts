import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authErrorResponse, requireAuth } from "@/lib/auth/require-auth";
import { canEditEntity } from "@/lib/services/entity-permissions";

type Params = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const ctx = await requireAuth(request);
    const { slug } = await params;
    const entity = await prisma.entity.findUnique({ where: { slug }, select: { id: true } });
    if (!entity) return NextResponse.json({ error: "未找到页面" }, { status: 404 });
    if (!(await canEditEntity(entity.id, ctx))) return NextResponse.json({ error: "无权查看历史" }, { status: 403 });
    const revisions = await prisma.contentRevision.findMany({
      where: { entityId: entity.id },
      orderBy: { createdAt: "desc" },
      take: 80,
      include: { user: { select: { displayName: true, unifiedUsername: true, email: true, phone: true } } },
    });
    return NextResponse.json({ revisions });
  } catch (error) {
    return authErrorResponse(error);
  }
}
