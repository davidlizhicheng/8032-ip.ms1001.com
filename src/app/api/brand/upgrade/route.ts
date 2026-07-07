import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  BRAND_UPGRADE_PLAN,
  BRAND_UPGRADE_PRICE_YUAN,
  DEV_MOCK_PAYMENT,
  getBillingUrl,
} from "@/lib/auth/config";
import {
  authErrorResponse,
  getBearerToken,
  hasBrandUpgrade,
  requireAuth,
} from "@/lib/auth/require-auth";
import { hasPremiumMembership } from "@/lib/auth/unified-auth";
import { PLATFORM_KEY } from "@/lib/auth/config";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireAuth(request);
    const returnUrl = request.nextUrl.searchParams.get("return") || request.headers.get("referer") || "/";
    const entityId = request.nextUrl.searchParams.get("entityId") || undefined;
    const cardId = request.nextUrl.searchParams.get("cardId") || undefined;

    const billingUrl = getBillingUrl({
      returnUrl,
      token: ctx.token,
      entityId,
      cardId,
    });

    return NextResponse.json({
      billingUrl,
      planId: BRAND_UPGRADE_PLAN,
      priceYuan: BRAND_UPGRADE_PRICE_YUAN,
      alreadyUpgraded: hasBrandUpgrade(ctx.user, ctx.suatUser),
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

const confirmSchema = z.object({
  entityId: z.string().optional(),
  cardId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireAuth(request);
    const body = confirmSchema.parse(await request.json().catch(() => ({})));

    if (hasBrandUpgrade(ctx.user, ctx.suatUser)) {
      return NextResponse.json({
        success: true,
        brandUpgrade: true,
        message: "您已开通品牌升级",
      });
    }

    const premium = hasPremiumMembership(ctx.suatUser, PLATFORM_KEY);

    if (premium || DEV_MOCK_PAYMENT) {
      const paidAt = new Date();
      await prisma.$transaction([
        prisma.user.update({
          where: { id: ctx.user.id },
          data: { brandUpgradeAt: paidAt },
        }),
        prisma.brandUpgradeOrder.create({
          data: {
            userId: ctx.user.id,
            entityId: body.entityId,
            cardId: body.cardId,
            planId: BRAND_UPGRADE_PLAN,
            amountYuan: BRAND_UPGRADE_PRICE_YUAN,
            status: "paid",
            paidAt,
            externalRef: premium ? "unified_membership" : "dev_mock",
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        brandUpgrade: true,
        message: premium ? "会员权益已同步" : "本地测试：品牌升级已开通",
      });
    }

    const pending = await prisma.brandUpgradeOrder.findFirst({
      where: { userId: ctx.user.id, status: "pending" },
      orderBy: { createdAt: "desc" },
    });

    if (!pending) {
      await prisma.brandUpgradeOrder.create({
        data: {
          userId: ctx.user.id,
          entityId: body.entityId,
          cardId: body.cardId,
          planId: BRAND_UPGRADE_PLAN,
          amountYuan: BRAND_UPGRADE_PRICE_YUAN,
          status: "pending",
        },
      });
    }

    return NextResponse.json({
      success: false,
      brandUpgrade: false,
      message: "尚未检测到支付成功，请完成支付后刷新",
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function PUT(request: NextRequest) {
  const token = getBearerToken(request);
  if (DEV_MOCK_PAYMENT && token === "dev-mock-token") {
    return POST(request);
  }
  return NextResponse.json({ error: "不支持的操作" }, { status: 405 });
}
