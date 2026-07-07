import { NextRequest, NextResponse } from "next/server";
import { BRAND_UPGRADE_PRICE_YUAN } from "@/lib/auth/config";
import {
  authErrorResponse,
  hasBrandUpgrade,
  optionalAuth,
} from "@/lib/auth/require-auth";

export async function GET(request: NextRequest) {
  try {
    const ctx = await optionalAuth(request);
    if (!ctx) {
      return NextResponse.json({
        user: null,
        brandUpgrade: false,
        brandUpgradePriceYuan: BRAND_UPGRADE_PRICE_YUAN,
      });
    }

    return NextResponse.json({
      user: {
        id: ctx.user.id,
        username: ctx.suatUser.username,
        name: ctx.suatUser.name || ctx.user.displayName,
        role: ctx.suatUser.role,
        tier: ctx.suatUser.tier,
      },
      brandUpgrade: hasBrandUpgrade(ctx.user, ctx.suatUser),
      brandUpgradePriceYuan: BRAND_UPGRADE_PRICE_YUAN,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
