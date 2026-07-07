import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { LeadSchema } from "@/lib/schemas/card";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = LeadSchema.parse(body);

    const card = await prisma.card.findUnique({ where: { id: input.cardId } });
    if (!card) {
      return NextResponse.json({ error: "名片不存在" }, { status: 404 });
    }

    const lead = await prisma.lead.create({
      data: {
        cardId: input.cardId,
        visitorName: input.visitorName,
        visitorPhone: input.visitorPhone,
        visitorWechat: input.visitorWechat,
        message: input.message,
        source: input.source,
      },
    });

    return NextResponse.json({ id: lead.id, success: true });
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
