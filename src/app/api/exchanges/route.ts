import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse, optionalAuth } from "@/lib/auth/require-auth";
import {
  createCardExchange,
  pickDefaultRequesterCard,
  pickDefaultRequesterEntity,
} from "@/lib/services/card-exchange";
import { prisma } from "@/lib/prisma";

const Schema = z.object({
  targetCardId: z.string().optional(),
  targetEntityId: z.string().optional(),
  targetEntitySlug: z.string().optional(),
  requesterCardId: z.string().optional(),
  requesterEntityId: z.string().optional(),
  visitorName: z.string().max(80).optional(),
  visitorPhone: z.string().max(80).optional(),
  visitorWechat: z.string().max(120).optional(),
  visitorMessage: z.string().max(1000).optional(),
  message: z.string().max(1000).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const input = Schema.parse(await request.json());
    const ctx = await optionalAuth(request);

    let targetCardId = input.targetCardId;
    let targetEntityId = input.targetEntityId;
    if (input.targetEntitySlug) {
      const entity = await prisma.entity.findUnique({
        where: { slug: input.targetEntitySlug },
        select: { id: true },
      });
      if (!entity) return NextResponse.json({ error: "档案不存在" }, { status: 404 });
      targetEntityId = entity.id;
    }
    if (!targetCardId && !targetEntityId) {
      return NextResponse.json({ error: "缺少交换对象" }, { status: 400 });
    }

    let requesterCardId = input.requesterCardId;
    let requesterEntityId = input.requesterEntityId;
    if (ctx?.user.id) {
      if (!requesterCardId) {
        const card = await pickDefaultRequesterCard(ctx.user.id);
        requesterCardId = card?.id;
      }
      if (!requesterCardId && !requesterEntityId) {
        const entity = await pickDefaultRequesterEntity(ctx.user.id);
        requesterEntityId = entity?.id;
      }
    }

    const exchange = await createCardExchange({
      requesterUserId: ctx?.user.id,
      requesterCardId,
      requesterEntityId,
      targetCardId,
      targetEntityId,
      visitorName: input.visitorName,
      visitorPhone: input.visitorPhone,
      visitorWechat: input.visitorWechat,
      visitorMessage: input.visitorMessage,
      message: input.message,
    });

    return NextResponse.json({
      success: true,
      id: exchange.id,
      status: exchange.status,
      message: ctx?.user.id
        ? "交换请求已发送，对方同意后可互看完整名片。"
        : "交换请求已提交，建议登录后便于对方回传名片。",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "参数错误" }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "提交失败" },
      { status: 400 },
    );
  }
}
