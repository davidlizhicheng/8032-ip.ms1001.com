import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authErrorResponse, requireAdmin } from "@/lib/auth/require-auth";

type Params = { params: Promise<{ slug: string; editorId: string }> };

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const ctx = await requireAdmin(request);
    const { slug, editorId } = await params;
    const entity = await prisma.entity.findUnique({ where: { slug }, select: { id: true } });
    if (!entity) return NextResponse.json({ error: "未找到页面" }, { status: 404 });
    const editor = await prisma.entityEditor.delete({
      where: { id: editorId },
    });
    await prisma.contentRevision.create({
      data: {
        entityId: entity.id,
        userId: ctx.user.id,
        action: "revoke_editor",
        beforeJson: JSON.stringify({ editorUserId: editor.userId, role: editor.role }),
        note: "移除页面编辑授权",
      },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
