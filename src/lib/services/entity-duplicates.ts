import { prisma } from "@/lib/prisma";
import { entityPath, reportPath } from "@/lib/utils/entity-paths";
import { entitySlug } from "@/lib/ai/detect-type";
import { readOverallScore } from "@/lib/scoring/entity-score";
import type { EntityType } from "@/lib/schemas/entity";

export function normalizeEntityName(name: string) {
  return name.trim().replace(/\s+/g, "").toLowerCase();
}

type EntityWithLatestReport = {
  id: string;
  type: string;
  name: string;
  slug: string;
  isFeatured?: boolean;
  isOfficial?: boolean;
  updatedAt?: Date;
  reports?: Array<{ scoreJson?: string | null }>;
};

export function dedupeEntitiesByName<T extends EntityWithLatestReport>(entities: T[]): T[] {
  const best = new Map<string, T>();
  for (const entity of entities) {
    const key = `${entity.type}:${normalizeEntityName(entity.name)}`;
    const current = best.get(key);
    if (!current || compareEntityQuality(entity, current) > 0) {
      best.set(key, entity);
    }
  }
  return [...best.values()];
}

export async function findReusableEntity(input: {
  name: string;
  type: EntityType;
  ownerUserId?: string;
}) {
  const name = input.name.trim();
  const slug = entitySlug(name);
  const candidates = await prisma.entity.findMany({
    where: {
      type: input.type,
      OR: [
        { name },
        { slug },
        { name: { equals: name } },
      ],
      AND: [
        {
          OR: [
            { visibility: "public" },
            input.ownerUserId ? { ownerUserId: input.ownerUserId } : { ownerUserId: null, visibility: "public" },
          ],
        },
      ],
    },
    include: {
      reports: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { scoreJson: true },
      },
    },
  });

  const exact = candidates.filter(
    (entity) =>
      normalizeEntityName(entity.name) === normalizeEntityName(name) ||
      entity.slug === slug,
  );
  const reusable = dedupeEntitiesByName(exact).sort(compareEntityQuality).reverse()[0];
  if (!reusable) return null;

  return {
    id: reusable.id,
    type: reusable.type,
    name: reusable.name,
    slug: reusable.slug,
    entityHref: entityPath(reusable.type, reusable.slug),
    reportHref: reportPath(reusable.type, reusable.slug),
  };
}

function compareEntityQuality(a: EntityWithLatestReport, b: EntityWithLatestReport) {
  const scoreA = readOverallScore(a.reports?.[0]?.scoreJson) ?? 0;
  const scoreB = readOverallScore(b.reports?.[0]?.scoreJson) ?? 0;
  if (scoreA !== scoreB) return scoreA - scoreB;
  if (Boolean(a.isFeatured) !== Boolean(b.isFeatured)) return a.isFeatured ? 1 : -1;
  if (Boolean(a.isOfficial) !== Boolean(b.isOfficial)) return a.isOfficial ? 1 : -1;
  return (a.updatedAt?.getTime() ?? 0) - (b.updatedAt?.getTime() ?? 0);
}
