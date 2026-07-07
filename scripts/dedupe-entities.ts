import { prisma } from "@/lib/prisma";
import { normalizeEntityName } from "@/lib/services/entity-duplicates";
import { readOverallScore } from "@/lib/scoring/entity-score";
import { entitySlug } from "@/lib/ai/detect-type";

type EntityRow = Awaited<ReturnType<typeof loadEntities>>[number];

async function loadEntities() {
  return prisma.entity.findMany({
    include: {
      reports: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { scoreJson: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

function quality(row: EntityRow) {
  const score = readOverallScore(row.reports[0]?.scoreJson) ?? 0;
  return [
    score,
    row.isFeatured ? 1 : 0,
    row.isOfficial ? 1 : 0,
    row.visibility === "public" ? 1 : 0,
    row.updatedAt.getTime(),
  ];
}

function compare(a: EntityRow, b: EntityRow) {
  const qa = quality(a);
  const qb = quality(b);
  for (let i = 0; i < qa.length; i += 1) {
    if (qa[i] !== qb[i]) return qa[i] - qb[i];
  }
  return 0;
}

async function main() {
  const rows = await loadEntities();
  const groups = new Map<string, EntityRow[]>();
  for (const row of rows) {
    const key = `${row.type}:${normalizeEntityName(row.name)}`;
    const group = groups.get(key) || [];
    group.push(row);
    groups.set(key, group);
  }

  let deleted = 0;
  let canonicalized = 0;
  for (const [, group] of groups) {
    if (group.length < 2) continue;
    const sorted = [...group].sort(compare).reverse();
    const keep = sorted[0];
    const remove = sorted.slice(1);
    await prisma.entity.deleteMany({
      where: { id: { in: remove.map((row) => row.id) } },
    });
    deleted += remove.length;
    console.log(
      `keep ${keep.type}/${keep.name}/${keep.slug}, deleted ${remove
        .map((row) => `${row.name}/${row.slug}`)
        .join(", ")}`,
    );
  }

  const remaining = await loadEntities();
  for (const row of remaining) {
    if (row.type !== "city") continue;
    const canonicalSlug = entitySlug(row.name);
    if (!canonicalSlug || row.slug === canonicalSlug) continue;
    const conflict = await prisma.entity.findUnique({ where: { slug: canonicalSlug }, select: { id: true } });
    if (conflict && conflict.id !== row.id) continue;
    await prisma.entity.update({
      where: { id: row.id },
      data: { slug: canonicalSlug },
    });
    canonicalized += 1;
    console.log(`canonicalized ${row.type}/${row.name}: ${row.slug} -> ${canonicalSlug}`);
  }

  console.log(`Deduped entities: deleted ${deleted} duplicate row(s), canonicalized ${canonicalized} slug(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
