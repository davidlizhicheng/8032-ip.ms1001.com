export function readOverallScore(scoreJson?: string | null): number | null {
  if (!scoreJson) return null;
  try {
    const parsed = JSON.parse(scoreJson) as { overall?: unknown; scores?: Record<string, unknown> };
    if (typeof parsed.overall === "number") return Math.round(parsed.overall);
    const values = Object.values(parsed.scores || {}).filter((v): v is number => typeof v === "number");
    if (values.length) return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
  } catch {
    return null;
  }
  return null;
}

type RankableEntity = {
  manualRankOrder?: number | null;
  reports?: Array<{ scoreJson?: string | null }>;
  _count?: { sources?: number; newsArticles?: number; mediaAssets?: number };
  likeCount?: number | null;
  isOfficial?: boolean;
  isFeatured?: boolean;
  updatedAt: Date;
};

function computeInnovationScore(entity: RankableEntity) {
  const reportScore = readOverallScore(entity.reports?.[0]?.scoreJson);
  const evidenceScore =
    58 +
    Math.min(14, (entity._count?.sources || 0) * 2) +
    Math.min(8, (entity._count?.newsArticles || 0) * 1.5) +
    Math.min(6, (entity._count?.mediaAssets || 0) * 1.2) +
    Math.min(8, entity.likeCount || 0) +
    (entity.isOfficial ? 3 : 0) +
    (entity.isFeatured ? 3 : 0);
  return Math.max(50, Math.min(99, reportScore ?? Math.round(evidenceScore)));
}

export function rankEntitiesForDisplay<T extends RankableEntity>(
  entities: T[],
): Array<T & { innovationScore: number }> {
  return [...entities]
    .map((entity) => ({ ...entity, innovationScore: computeInnovationScore(entity) }))
    .sort((a, b) => {
      if (typeof a.manualRankOrder === "number" || typeof b.manualRankOrder === "number") {
        return (a.manualRankOrder ?? Number.MAX_SAFE_INTEGER) - (b.manualRankOrder ?? Number.MAX_SAFE_INTEGER);
      }
      return (
        (b.innovationScore || 0) - (a.innovationScore || 0) ||
        b.updatedAt.getTime() - a.updatedAt.getTime()
      );
    });
}

export function sortEntitiesByScore<T extends RankableEntity>(entities: T[]): T[] {
  return rankEntitiesForDisplay(entities);
}
