import { NextRequest, NextResponse } from "next/server";
import { getCardForViewer } from "@/lib/services/card";
import { authErrorResponse, optionalAuth } from "@/lib/auth/require-auth";

type Params = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { slug } = await params;
    const ctx = await optionalAuth(request);
    const isAdmin = ctx?.suatUser.role === "ADMIN";
    const card = await getCardForViewer(slug, ctx?.user.id, isAdmin);
    if (!card) {
      return NextResponse.json({ error: "无权查看或不存在" }, { status: 403 });
    }
    return NextResponse.json(card);
  } catch (error) {
    return authErrorResponse(error);
  }
}
