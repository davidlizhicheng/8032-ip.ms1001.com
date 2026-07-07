import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ClaimRequestSchema } from "@/lib/schemas/entity";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = ClaimRequestSchema.parse(body);

    const entity = await prisma.entity.findUnique({ where: { id: input.entityId } });
    if (!entity) {
      return NextResponse.json({ error: "实体不存在" }, { status: 404 });
    }

    const claim = await prisma.claimRequest.create({
      data: {
        entityId: input.entityId,
        claimType: input.claimType,
        proofText: `${input.proofText}\n联系人：${input.contactName || ""} ${input.contactPhone || ""} ${input.contactEmail || ""}`,
        status: "pending",
      },
    });

    await prisma.auditLog.create({
      data: {
        entityId: input.entityId,
        action: "claim_requested",
        details: `认领申请：${input.claimType}`,
      },
    });

    return NextResponse.json({ id: claim.id, success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: "提交失败" }, { status: 500 });
  }
}

export async function GET() {
  const claims = await prisma.claimRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { entity: true },
  });
  return NextResponse.json(claims);
}
