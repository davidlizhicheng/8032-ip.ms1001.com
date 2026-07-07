import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { optionalAuth } from "@/lib/auth/require-auth";
import {
  createCardExchange,
  pickDefaultRequesterCard,
  pickDefaultRequesterEntity,
} from "@/lib/services/card-exchange";

const ContactSchema = z.object({
  visitorName: z.string().max(80).optional(),
  visitorPhone: z.string().max(80).optional(),
  visitorWechat: z.string().max(120).optional(),
  message: z.string().max(1000).optional(),
  source: z.enum(["exchange_card", "online_chat"]),
});

type Props = { params: Promise<{ slug: string }> };

export async function POST(request: NextRequest, { params }: Props) {
  try {
    const { slug } = await params;
    const input = ContactSchema.parse(await request.json());
    const ctx = await optionalAuth(request);
    const entity = await prisma.entity.findUnique({
      where: { slug },
      select: { id: true, visibility: true, status: true, ownerUserId: true },
    });
    if (!entity || entity.visibility === "admin_hidden" || entity.status === "hidden") {
      return NextResponse.json({ error: "档案不存在" }, { status: 404 });
    }

    const hasContact =
      Boolean(input.visitorName?.trim()) ||
      Boolean(input.visitorPhone?.trim()) ||
      Boolean(input.visitorWechat?.trim()) ||
      Boolean(input.message?.trim());
    if (!hasContact) {
      return NextResponse.json({ error: "请填写联系方式或留言内容" }, { status: 400 });
    }

    await prisma.lead.create({
      data: {
        entityId: entity.id,
        visitorName: input.visitorName?.trim() || null,
        visitorPhone: input.visitorPhone?.trim() || null,
        visitorWechat: input.visitorWechat?.trim() || null,
        message: input.message?.trim() || null,
        source: input.source,
      },
    });

    let exchangeId: string | undefined;
    if (input.source === "exchange_card") {
      let requesterCardId: string | undefined;
      let requesterEntityId: string | undefined;
      if (ctx?.user.id) {
        const card = await pickDefaultRequesterCard(ctx.user.id);
        requesterCardId = card?.id;
        if (!requesterCardId) {
          const ownEntity = await pickDefaultRequesterEntity(ctx.user.id);
          requesterEntityId = ownEntity?.id;
        }
      }
      const exchange = await createCardExchange({
        requesterUserId: ctx?.user.id,
        requesterCardId,
        requesterEntityId,
        targetEntityId: entity.id,
        visitorName: input.visitorName,
        visitorPhone: input.visitorPhone,
        visitorWechat: input.visitorWechat,
        visitorMessage: input.message,
      });
      exchangeId = exchange.id;
    }

    return NextResponse.json({
      success: true,
      exchangeId,
      message:
        input.source === "exchange_card"
          ? exchangeId
            ? "交换请求已发送，对方同意后可互看完整名片与联系方式。"
            : "留言已提交。"
          : "消息已发送，品牌方可在后台查看并回复。",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "参数错误" }, { status: 400 });
    }
    return NextResponse.json({ error: "提交失败" }, { status: 500 });
  }
}
