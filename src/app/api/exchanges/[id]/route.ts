import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse, requireAuth } from "@/lib/auth/require-auth";
import { getExchangePeerView, respondToExchange } from "@/lib/services/card-exchange";

type Props = { params: Promise<{ id: string }> };

const PatchSchema = z.object({
  status: z.enum(["accepted", "rejected"]),
});

export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    const ctx = await requireAuth(request);
    const { id } = await params;
    const input = PatchSchema.parse(await request.json());
    const updated = await respondToExchange(id, ctx.user.id, input.status);
    return NextResponse.json({ success: true, exchange: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "参数错误" }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "处理失败" },
      { status: 400 },
    );
  }
}

export async function GET(request: NextRequest, { params }: Props) {
  try {
    const ctx = await requireAuth(request);
    const { id } = await params;
    const peer = await getExchangePeerView(id, ctx.user.id);
    if (!peer) {
      return NextResponse.json({ error: "尚未通过或无权查看" }, { status: 403 });
    }
    return NextResponse.json({ peer });
  } catch (error) {
    return authErrorResponse(error);
  }
}
