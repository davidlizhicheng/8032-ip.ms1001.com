import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authErrorResponse, requireAdmin } from "@/lib/auth/require-auth";

const ReorderSchema = z.object({
  kind: z.enum(["entity", "card"]),
  orderedIds: z.array(z.string()).min(1).max(500),
});

/** 批量拖动排序：按 orderedIds 顺序写入 manualRankOrder 1..n */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const { kind, orderedIds } = ReorderSchema.parse(await request.json());

    await prisma.$transaction(
      orderedIds.map((id, index) =>
        kind === "entity"
          ? prisma.entity.update({
              where: { id },
              data: { manualRankOrder: index + 1 },
            })
          : prisma.card.update({
              where: { id },
              data: { manualRankOrder: index + 1 },
            }),
      ),
    );

    return NextResponse.json({ success: true, count: orderedIds.length });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return authErrorResponse(error);
  }
}
