import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const UpdateSchema = z.object({
  status: z.enum(["pending", "approved", "rejected"]),
  reviewNote: z.string().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const input = UpdateSchema.parse(body);

    const claim = await prisma.claimRequest.update({
      where: { id },
      data: {
        status: input.status,
        reviewNote: input.reviewNote,
      },
      include: { entity: true },
    });

    if (input.status === "approved" && claim.entity) {
      await prisma.entity.update({
        where: { id: claim.entityId },
        data: {
          status: "claimed",
          isVerified: true,
          ownerUserId: claim.userId || undefined,
        },
      });

      if (claim.userId) {
        await prisma.entityEditor.upsert({
          where: {
            entityId_userId: { entityId: claim.entityId, userId: claim.userId },
          },
          create: {
            entityId: claim.entityId,
            userId: claim.userId,
            role: "owner_delegate",
            grantedBy: "claim_approved",
          },
          update: { role: "owner_delegate" },
        });
      }
    }

    await prisma.auditLog.create({
      data: {
        entityId: claim.entityId,
        action: `claim_${input.status}`,
        details: input.reviewNote || `认领审核：${input.status}`,
      },
    });

    return NextResponse.json(claim);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const claim = await prisma.claimRequest.findUnique({
    where: { id },
    include: { entity: { include: { profile: true } } },
  });
  if (!claim) return NextResponse.json({ error: "未找到" }, { status: 404 });
  return NextResponse.json(claim);
}
