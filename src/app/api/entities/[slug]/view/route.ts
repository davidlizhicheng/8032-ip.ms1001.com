import { NextRequest, NextResponse } from "next/server";
import { getEntityBySlug } from "@/lib/services/entity";
import { authErrorResponse, optionalAuth } from "@/lib/auth/require-auth";
import { canViewContent } from "@/lib/visibility";

type Params = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { slug } = await params;
    const entity = await getEntityBySlug(slug);
    if (!entity) {
      return NextResponse.json({ error: "未找到" }, { status: 404 });
    }

    const ctx = await optionalAuth(request);
    const isAdmin = ctx?.suatUser.role === "ADMIN";
    if (
      !canViewContent({
        visibility: entity.visibility,
        ownerUserId: entity.ownerUserId,
        viewerUserId: ctx?.user.id,
        isAdmin,
      })
    ) {
      return NextResponse.json({ error: "无权查看" }, { status: 403 });
    }

    return NextResponse.json(entity);
  } catch (error) {
    return authErrorResponse(error);
  }
}
