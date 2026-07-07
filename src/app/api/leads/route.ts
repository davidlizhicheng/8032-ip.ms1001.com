import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { LeadSchema } from "@/lib/schemas/card";
import { optionalAuth } from "@/lib/auth/require-auth";
import {
  createCardExchange,
  pickDefaultRequesterCard,
  pickDefaultRequesterEntity,
} from "@/lib/services/card-exchange";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = LeadSchema.parse(body);
    const ctx = await optionalAuth(request);

    const card = await prisma.card.findUnique({ where: { id: input.cardId } });
    if (!card) {
      return NextResponse.json({ error: "名片不存在" }, { status: 404 });
    }

    await prisma.lead.create({
      data: {
        cardId: input.cardId,
        visitorName: input.visitorName,
        visitorPhone: input.visitorPhone,
        visitorWechat: input.visitorWechat,
        message: input.message,
        source: input.source,
      },
    });

    let exchangeId: string | undefined;
    if (input.source === "save_card" || input.source === "consult") {
      let requesterCardId: string | undefined;
      let requesterEntityId: string | undefined;
      if (ctx?.user.id) {
        const ownCard = await pickDefaultRequesterCard(ctx.user.id);
        requesterCardId = ownCard?.id;
        if (!requesterCardId) {
          const ownEntity = await pickDefaultRequesterEntity(ctx.user.id);
          requesterEntityId = ownEntity?.id;
        }
      }
      const exchange = await createCardExchange({
        requesterUserId: ctx?.user.id,
        requesterCardId,
        requesterEntityId,
        targetCardId: card.id,
        visitorName: input.visitorName,
        visitorPhone: input.visitorPhone,
        visitorWechat: input.visitorWechat,
        visitorMessage: input.message,
      });
      exchangeId = exchange.id;
    }

    return NextResponse.json({
      id: exchangeId,
      success: true,
      message: exchangeId
        ? "交换请求已发送，对方同意后可互看完整名片。"
        : "提交成功，感谢关注！",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "参数错误" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "提交失败" }, { status: 500 });
  }
}
