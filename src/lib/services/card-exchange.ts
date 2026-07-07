import { prisma } from "@/lib/prisma";
import { parseEntityContact } from "@/lib/content/entity-contact";
import { entityPath } from "@/lib/utils/entity-paths";

export type ExchangeStatus = "pending" | "accepted" | "rejected";

export type ExchangePeerView = {
  kind: "card" | "entity";
  name: string;
  href: string;
  phone?: string | null;
  email?: string | null;
  wechat?: string | null;
  address?: string | null;
  title?: string | null;
  company?: string | null;
  subtitle?: string | null;
};

async function resolveTargetOwner(targetCardId?: string | null, targetEntityId?: string | null) {
  if (targetCardId) {
    const card = await prisma.card.findUnique({
      where: { id: targetCardId },
      select: { userId: true },
    });
    return card?.userId || null;
  }
  if (targetEntityId) {
    const entity = await prisma.entity.findUnique({
      where: { id: targetEntityId },
      select: { ownerUserId: true },
    });
    return entity?.ownerUserId || null;
  }
  return null;
}

export async function createCardExchange(input: {
  requesterUserId?: string;
  requesterCardId?: string;
  requesterEntityId?: string;
  targetCardId?: string;
  targetEntityId?: string;
  visitorName?: string;
  visitorPhone?: string;
  visitorWechat?: string;
  visitorMessage?: string;
  message?: string;
}) {
  const targetUserId = await resolveTargetOwner(input.targetCardId, input.targetEntityId);
  if (!input.targetCardId && !input.targetEntityId) {
    throw new Error("缺少交换对象");
  }

  const hasVisitor =
    Boolean(input.visitorName?.trim()) ||
    Boolean(input.visitorPhone?.trim()) ||
    Boolean(input.visitorWechat?.trim()) ||
    Boolean(input.visitorMessage?.trim()) ||
    Boolean(input.message?.trim());
  if (!input.requesterUserId && !hasVisitor) {
    throw new Error("请填写联系方式或先登录");
  }

  return prisma.cardExchange.create({
    data: {
      requesterUserId: input.requesterUserId || null,
      requesterCardId: input.requesterCardId || null,
      requesterEntityId: input.requesterEntityId || null,
      targetCardId: input.targetCardId || null,
      targetEntityId: input.targetEntityId || null,
      targetUserId,
      visitorName: input.visitorName?.trim() || null,
      visitorPhone: input.visitorPhone?.trim() || null,
      visitorWechat: input.visitorWechat?.trim() || null,
      visitorMessage: input.visitorMessage?.trim() || input.message?.trim() || null,
      message: input.message?.trim() || null,
      status: "pending",
    },
  });
}

export async function listUserExchanges(userId: string) {
  const [inbox, sent] = await Promise.all([
    prisma.cardExchange.findMany({
      where: { targetUserId: userId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        requesterUser: { select: { id: true, displayName: true, unifiedUsername: true } },
        requesterCard: { select: { id: true, slug: true, name: true, phone: true, email: true } },
        requesterEntity: { select: { id: true, slug: true, name: true, type: true } },
        targetCard: { select: { id: true, slug: true, name: true } },
        targetEntity: { select: { id: true, slug: true, name: true, type: true } },
      },
    }),
    prisma.cardExchange.findMany({
      where: { requesterUserId: userId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        targetUser: { select: { id: true, displayName: true, unifiedUsername: true } },
        targetCard: { select: { id: true, slug: true, name: true } },
        targetEntity: { select: { id: true, slug: true, name: true, type: true } },
        requesterCard: { select: { id: true, slug: true, name: true } },
        requesterEntity: { select: { id: true, slug: true, name: true, type: true } },
      },
    }),
  ]);
  return { inbox, sent };
}

export async function respondToExchange(
  exchangeId: string,
  actorUserId: string,
  status: ExchangeStatus,
) {
  const row = await prisma.cardExchange.findUnique({ where: { id: exchangeId } });
  if (!row) throw new Error("交换请求不存在");
  if (row.targetUserId !== actorUserId) throw new Error("无权处理该请求");
  if (row.status !== "pending") throw new Error("该请求已处理");

  return prisma.cardExchange.update({
    where: { id: exchangeId },
    data: { status, respondedAt: new Date() },
  });
}

export async function getExchangePeerView(
  exchangeId: string,
  viewerUserId: string,
): Promise<ExchangePeerView | null> {
  const row = await prisma.cardExchange.findUnique({
    where: { id: exchangeId },
    include: {
      requesterCard: true,
      requesterEntity: { include: { profile: true } },
      targetCard: true,
      targetEntity: { include: { profile: true } },
    },
  });
  if (!row || row.status !== "accepted") return null;
  const isRequester = row.requesterUserId === viewerUserId;
  const isTarget = row.targetUserId === viewerUserId;
  if (!isRequester && !isTarget) return null;

  if (isRequester) {
    if (row.targetCard) {
      return {
        kind: "card",
        name: row.targetCard.name,
        href: `/u/${row.targetCard.slug}`,
        phone: row.targetCard.phone,
        email: row.targetCard.email,
        wechat: row.targetCard.wechat,
        address: row.targetCard.address,
        title: row.targetCard.title,
        company: row.targetCard.company,
      };
    }
    if (row.targetEntity) {
      const contact = parseEntityContact(row.targetEntity.profile?.contentJson);
      return {
        kind: "entity",
        name: row.targetEntity.name,
        href: entityPath(row.targetEntity.type, row.targetEntity.slug),
        phone: contact.phone || null,
        email: contact.email || null,
        wechat: contact.wechat || null,
        address: contact.address || null,
        title: row.targetEntity.profile?.title || null,
        subtitle: row.targetEntity.profile?.subtitle || null,
      };
    }
  }

  if (row.requesterCard) {
    return {
      kind: "card",
      name: row.requesterCard.name,
      href: `/u/${row.requesterCard.slug}`,
      phone: row.requesterCard.phone,
      email: row.requesterCard.email,
      wechat: row.requesterCard.wechat,
      address: row.requesterCard.address,
      title: row.requesterCard.title,
      company: row.requesterCard.company,
    };
  }
  if (row.requesterEntity) {
    const contact = parseEntityContact(row.requesterEntity.profile?.contentJson);
    return {
      kind: "entity",
      name: row.requesterEntity.name,
      href: entityPath(row.requesterEntity.type, row.requesterEntity.slug),
      phone: contact.phone || row.visitorPhone,
      email: contact.email || null,
      wechat: contact.wechat || row.visitorWechat,
      address: contact.address || null,
      title: row.requesterEntity.profile?.title || null,
      subtitle: row.requesterEntity.profile?.subtitle || null,
    };
  }

  return {
    kind: "card",
    name: row.visitorName || "访客",
    href: "#",
    phone: row.visitorPhone,
    wechat: row.visitorWechat,
    subtitle: row.visitorMessage || row.message,
  };
}

export async function pickDefaultRequesterCard(userId: string) {
  return prisma.card.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });
}

export async function pickDefaultRequesterEntity(userId: string) {
  return prisma.entity.findFirst({
    where: { ownerUserId: userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });
}
