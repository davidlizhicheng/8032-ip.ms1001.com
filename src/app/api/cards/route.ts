import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createCard } from "@/lib/services/card";
import { CreateCardSchema } from "@/lib/schemas/card";
import { authErrorResponse, optionalAuth } from "@/lib/auth/require-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = CreateCardSchema.parse(body);
    const ctx = await optionalAuth(request);
    const card = await createCard(input, ctx?.user.id);
    return NextResponse.json({
      id: card.id,
      slug: card.slug,
      href: `/u/${card.slug}`,
      visibility: card.visibility,
      message: "名片已创建，默认仅自己可见。登录后在「我的品牌页」可设为公开。",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "参数错误" },
        { status: 400 },
      );
    }
    return authErrorResponse(error);
  }
}
