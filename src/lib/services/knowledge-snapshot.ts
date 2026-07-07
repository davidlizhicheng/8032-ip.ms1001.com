import { prisma } from "@/lib/prisma";
import { cleanEncyclopediaText } from "@/lib/content/source-clean";
import type { EnrichedSource } from "@/lib/search/baike-fetcher";

export type SnapshotInput = {
  entityId?: string;
  entityName: string;
  entityType: string;
  sources: EnrichedSource[];
};

export async function saveKnowledgeSnapshots(input: SnapshotInput): Promise<number> {
  if (!input.sources.length) return 0;

  const rows = input.sources
    .map((source) => {
      const sourceKind =
        source.sourceType === "wiki"
          ? "wiki"
          : source.sourceType === "baike"
            ? "baike"
            : source.sourceType === "gov"
              ? "gov"
              : "web";
      const raw = source.fullText || source.snippet || "";
      const clean = cleanEncyclopediaText(raw, sourceKind === "gov" ? "web" : sourceKind);
      if (clean.length < 40) return null;

      return {
        entityId: input.entityId,
        entityName: input.entityName,
        entityType: input.entityType,
        sourceType: sourceKind,
        title: source.title,
        url: source.url,
        rawText: raw.slice(0, 50000),
        cleanText: clean.slice(0, 30000),
        charCount: clean.length,
        fetchStatus: clean.length >= 200 ? "ok" : "partial",
      };
    })
    .filter(Boolean) as Array<{
    entityId?: string;
    entityName: string;
    entityType: string;
    sourceType: string;
    title: string;
    url?: string;
    rawText: string;
    cleanText: string;
    charCount: number;
    fetchStatus: string;
  }>;

  if (!rows.length) return 0;

  await prisma.knowledgeSnapshot.createMany({ data: rows });
  return rows.length;
}

export async function linkSnapshotsToEntity(entityName: string, entityType: string, entityId: string) {
  await prisma.knowledgeSnapshot.updateMany({
    where: { entityName, entityType, entityId: null },
    data: { entityId },
  });
}

export function buildContextFromSnapshots(
  snapshots: Array<{ title: string; url: string | null; sourceType: string; cleanText: string }>,
): string {
  return snapshots
    .map(
      (s, i) =>
        `[权威资料 ${i + 1}] ${s.title}\n来源：${s.sourceType}${s.url ? `（${s.url}）` : ""}\n正文：\n${s.cleanText}`,
    )
    .join("\n\n");
}

export async function getLatestSnapshotContext(
  entityName: string,
  entityType: string,
): Promise<string> {
  const snapshots = await prisma.knowledgeSnapshot.findMany({
    where: { entityName, entityType },
    orderBy: { fetchedAt: "desc" },
    take: 8,
  });
  return buildContextFromSnapshots(snapshots);
}

export async function listPendingReviewEntities(limit = 50) {
  return prisma.entity.findMany({
    where: { status: "pending_review" },
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: {
      profile: true,
      knowledgeSnapshots: { orderBy: { fetchedAt: "desc" }, take: 3 },
    },
  });
}

export async function publishEntity(entityId: string) {
  return prisma.entity.update({
    where: { id: entityId },
    data: { status: "published", visibility: "public" },
  });
}
