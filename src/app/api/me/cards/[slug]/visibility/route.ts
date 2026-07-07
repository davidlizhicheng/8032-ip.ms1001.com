import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authErrorResponse, requireAuth } from "@/lib/auth/require-auth";
import { canPublishWithVerification, getCardVerificationStatus } from "@/lib/services/verification";

type Params = { params: Promise<{ slug: string }> };

const Schema = z.object({
  visibility: z.enum(["private", "public"]),
});

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const ctx = await requireAuth(request);
    const { slug } = await params;
    const body = Schema.parse(await request.json());

    const card = await prisma.card.findUnique({ where: { slug } });
    if (!card || card.userId !== ctx.user.id) {
      return NextResponse.json({ error: "无权操作" }, { status: 403 });
    }

    if (body.visibility === "public") {
      const status = await getCardVerificationStatus(card.id);
      const gate = canPublishWithVerification(status, {
        isAdmin: ctx.suatUser.role === "ADMIN",
      });
      if (!gate.ok) {
        return NextResponse.json({ error: gate.message }, { status: 400 });
      }
    }

    const updated = await prisma.card.update({
      where: { id: card.id },
      data: { visibility: body.visibility },
    });

    return NextResponse.json({ success: true, visibility: updated.visibility });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return authErrorResponse(error);
  }
}
