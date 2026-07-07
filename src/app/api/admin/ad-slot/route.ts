import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse, requireAdmin } from "@/lib/auth/require-auth";
import { getAdSlotConfig, saveAdSlotConfig } from "@/lib/services/ad-slot";

const Schema = z.object({
  enabled: z.boolean().default(true),
  eyebrow: z.string().default("推荐品牌"),
  title: z.string().min(1),
  description: z.string().default(""),
  ctaLabel: z.string().default("了解更多"),
  href: z.string().default("#"),
  imageUrl: z.string().default(""),
});

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const ad = await getAdSlotConfig();
    return NextResponse.json({ ad });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin(request);
    const input = Schema.parse(await request.json());
    const ad = await saveAdSlotConfig(input);
    return NextResponse.json({ success: true, ad });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return authErrorResponse(error);
  }
}
