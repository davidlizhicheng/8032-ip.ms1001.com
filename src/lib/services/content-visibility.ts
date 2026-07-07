import { prisma } from "@/lib/prisma";
import { featuredWhere, listableWhere } from "@/lib/visibility";
import type { EntityType } from "@/lib/schemas/entity";
import { dedupeEntitiesByName } from "@/lib/services/entity-duplicates";

export async function getFeaturedEntitiesByType(type: EntityType, limit = 12) {
  return prisma.entity.findMany({
    where: featuredWhere(type),
    include: {
      profile: true,
      reports: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { scoreJson: true },
      },
      _count: {
        select: {
          sources: true,
          newsArticles: true,
          mediaAssets: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });
}

export async function getPublicEntitiesByType(type: EntityType, limit = 200) {
  const rows = await prisma.entity.findMany({
    where: listableWhere(type),
    include: {
      profile: true,
      reports: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { scoreJson: true },
      },
      _count: {
        select: {
          sources: true,
          newsArticles: true,
          mediaAssets: true,
        },
      },
    },
    orderBy: [{ isFeatured: "desc" }, { updatedAt: "desc" }],
    take: Math.max(limit * 3, limit),
  });
  return dedupeEntitiesByName(rows).slice(0, limit);
}

/** 首页/榜单：公开档案去重后按评分排序 */
export async function getRankedPublicEntitiesByType(type: EntityType, limit = 50) {
  return getPublicEntitiesByType(type, limit);
}

export async function getPublicCards(limit = 200) {
  return prisma.card.findMany({
    where: { visibility: "public", status: "published" },
    orderBy: [{ isFeatured: "desc" }, { updatedAt: "desc" }],
    take: limit,
    select: {
      id: true,
      slug: true,
      name: true,
      title: true,
      company: true,
      brandSlogan: true,
      bio: true,
      avatarUrl: true,
      isFeatured: true,
      manualRankOrder: true,
      visibility: true,
      userId: true,
    },
  });
}

export async function getUserPages(userId: string) {
  const [cards, entities] = await Promise.all([
    prisma.card.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        slug: true,
        name: true,
        title: true,
        visibility: true,
        isFeatured: true,
        updatedAt: true,
      },
    }),
    prisma.entity.findMany({
      where: { ownerUserId: userId },
      include: {
        profile: { select: { summary: true, slogan: true } },
        reports: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);
  return { cards, entities };
}

/** 撤回全部旧档案，等待管理员批量重新生成 */
export async function withdrawAllEntities() {
  const result = await prisma.entity.updateMany({
    where: { visibility: { not: "admin_hidden" } },
    data: {
      visibility: "admin_hidden",
      status: "hidden",
      isFeatured: false,
    },
  });
  return result.count;
}

export async function adminListContent(type?: string) {
  const rows = await prisma.entity.findMany({
    where: type ? { type } : undefined,
    include: { profile: true },
    orderBy: { updatedAt: "desc" },
    take: 300,
  });
  return rows.sort((a, b) => (a.manualRankOrder ?? Number.MAX_SAFE_INTEGER) - (b.manualRankOrder ?? Number.MAX_SAFE_INTEGER));
}

export async function adminListCards() {
  const rows = await prisma.card.findMany({
    orderBy: { updatedAt: "desc" },
    take: 300,
    include: {
      user: { select: { displayName: true, unifiedUsername: true } },
      sections: {
        where: { type: "verification" },
        take: 1,
      },
    },
  });
  return rows.sort((a, b) => (a.manualRankOrder ?? Number.MAX_SAFE_INTEGER) - (b.manualRankOrder ?? Number.MAX_SAFE_INTEGER));
}
