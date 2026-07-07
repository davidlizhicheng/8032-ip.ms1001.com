import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse, requireAuth } from "@/lib/auth/require-auth";
import { createSelfBrandPage } from "@/lib/services/self-brand-create";

const Schema = z.object({
  name: z.string().min(1),
  entityType: z.enum(["person", "company"]),
  title: z.string().optional(),
  company: z.string().optional(),
  brandSlogan: z.string().optional(),
  bio: z.string().min(20, "自我介绍至少 20 字"),
  longBio: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  wechat: z.string().optional(),
  address: z.string().optional(),
  generateReport: z.boolean().default(true),
});

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireAuth(request);
    const input = Schema.parse(await request.json());
    const result = await createSelfBrandPage({
      ...input,
      ownerUserId: ctx.user.id,
    });
    return NextResponse.json({
      success: true,
      ...result,
      message:
        "自助品牌页已创建！默认私密，您可随时编辑；确认无误后在「我的品牌页」设为公开，即进入案例库与榜单推荐。",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "参数错误" }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "创建失败" },
      { status: 400 },
    );
  }
}
