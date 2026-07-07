import { prisma } from "@/lib/prisma";

export type VerificationStatus = "none" | "pending_review" | "approved" | "rejected";

export type VerificationInfo = {
  status: VerificationStatus;
  method?: string;
  account?: string;
  proofCount?: number;
  note?: string;
  companySize?: string;
};

export function parseVerificationContent(content: string | null | undefined): VerificationInfo | null {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content) as VerificationInfo;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function getCardVerificationStatus(cardId: string): Promise<VerificationStatus> {
  const section = await prisma.cardSection.findFirst({
    where: { cardId, type: "verification" },
    select: { content: true },
  });
  const info = parseVerificationContent(section?.content);
  return info?.status || "none";
}

export function canPublishWithVerification(
  status: VerificationStatus,
  options?: { isAdmin?: boolean; allowNone?: boolean },
): { ok: boolean; message?: string } {
  if (options?.isAdmin) return { ok: true };
  if (status === "approved") return { ok: true };
  if (status === "pending_review") {
    return { ok: false, message: "认证材料待管理员确认，确认后方可公开" };
  }
  if (status === "rejected") {
    return { ok: false, message: "认证未通过，请补充材料后重新提交" };
  }
  if (options?.allowNone) return { ok: true };
  return { ok: false, message: "请先提交认证材料，待管理员首次确认后再公开" };
}

export async function canPublishEntity(
  entity: { id: string; slug: string; isVerified: boolean; status: string; ownerUserId?: string | null },
  options?: { isAdmin?: boolean },
): Promise<{ ok: boolean; message?: string }> {
  if (options?.isAdmin) return { ok: true };
  if (entity.isVerified || entity.status === "verified" || entity.status === "claimed") {
    return { ok: true };
  }
  const approvedClaim = await prisma.claimRequest.findFirst({
    where: { entityId: entity.id, status: "approved" },
    select: { id: true },
  });
  if (approvedClaim) return { ok: true };

  if (entity.ownerUserId) {
    const linkedCard = await prisma.card.findFirst({
      where: { userId: entity.ownerUserId, slug: `${entity.slug}-card` },
      select: { id: true },
    });
    if (linkedCard) {
      const cardStatus = await getCardVerificationStatus(linkedCard.id);
      const gate = canPublishWithVerification(cardStatus, options);
      if (gate.ok) return { ok: true };
    }
  }

  return {
    ok: false,
    message: "档案公开需先完成认领认证，待管理员确认后方可公开",
  };
}
