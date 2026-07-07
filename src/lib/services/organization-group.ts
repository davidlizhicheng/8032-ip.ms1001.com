import { prisma } from "@/lib/prisma";
import { listableWhere } from "@/lib/visibility";

const publicGroupWhere = { visibility: "public" as const };

const groupOrderBy = [
  { isFeatured: "desc" as const },
  { manualRankOrder: "asc" as const },
  { createdAt: "desc" as const },
];

export async function listPublicOrganizationGroups(limit = 50) {
  return prisma.organizationGroup.findMany({
    where: publicGroupWhere,
    orderBy: groupOrderBy,
    take: limit,
    include: {
      _count: { select: { members: true } },
      hostEntity: { include: { profile: true } },
    },
  });
}

export async function listFeaturedOrganizationGroups(limit = 6) {
  return prisma.organizationGroup.findMany({
    where: { ...publicGroupWhere, isFeatured: true },
    orderBy: groupOrderBy,
    take: limit,
    include: {
      _count: { select: { members: true } },
    },
  });
}

export async function getOrganizationGroupBySlug(slug: string) {
  const group = await prisma.organizationGroup.findFirst({
    where: { slug, ...publicGroupWhere },
    include: {
      hostEntity: { include: { profile: true } },
      members: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: {
          entity: {
            include: {
              profile: true,
              reports: {
                orderBy: { createdAt: "desc" },
                take: 1,
                select: { scoreJson: true },
              },
            },
          },
        },
      },
    },
  });

  if (!group) return null;

  const visibleMembers = group.members.filter((m) => {
    const e = m.entity;
    const where = listableWhere();
    return (
      e.visibility === where.visibility &&
      (where.status.in as string[]).includes(e.status)
    );
  });

  return { ...group, members: visibleMembers };
}
