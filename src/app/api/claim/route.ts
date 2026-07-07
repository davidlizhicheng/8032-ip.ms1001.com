import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { ClaimRequestSchema } from "@/lib/schemas/entity";
import { validateClaimVerification } from "@/lib/config/claim-verification";
import { authErrorResponse, requireAuth } from "@/lib/auth/require-auth";

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireAuth(request);
    const body = await request.json();
    const input = ClaimRequestSchema.parse(body);

    const method =
      input.companySize === "large"
        ? "company_email"
        : input.verificationMethod || "frontdesk_photos";
    const validationError = validateClaimVerification({
      companySize: input.companySize,
      verificationMethod: method,
      contactEmail: input.contactEmail,
      proofFiles: input.proofFiles,
      personalCommitment: input.personalCommitment,
      disclaimerAccepted: input.disclaimerAccepted,
    });
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const entity = await prisma.entity.findUnique({ where: { id: input.entityId } });
    if (!entity) {
      return NextResponse.json({ error: "实体不存在" }, { status: 404 });
    }

    const pending = await prisma.claimRequest.findFirst({
      where: { entityId: input.entityId, userId: ctx.user.id, status: "pending" },
    });
    if (pending) {
      return NextResponse.json({ error: "您已有待审核的认领申请" }, { status: 409 });
    }

    const claim = await prisma.claimRequest.create({
      data: {
        entityId: input.entityId,
        userId: ctx.user.id,
        claimType: input.claimType,
        companySize: input.companySize,
        verificationMethod: method,
        contactName: input.contactName,
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail,
        proofText: input.proofText,
        proofFiles: input.proofFiles?.length ? JSON.stringify(input.proofFiles) : null,
        personalCommitment: input.personalCommitment,
        disclaimerAccepted: input.disclaimerAccepted,
        status: "pending",
      },
    });

    await prisma.auditLog.create({
      data: {
        entityId: input.entityId,
        action: "claim_requested",
        details: `认领申请：${input.claimType} · ${input.companySize === "large" ? "大公司邮箱" : "中小企业材料"}`,
      },
    });

    return NextResponse.json({ id: claim.id, success: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "参数错误" }, { status: 400 });
    }
    return authErrorResponse(error);
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
