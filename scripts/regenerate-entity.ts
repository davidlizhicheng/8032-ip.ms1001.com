import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { generateAndSaveEntity } from "../src/lib/services/entity";

const name = process.argv[2] || "广州";
const type = process.argv[3] || "city";

async function main() {
  const url = process.env.DATABASE_URL || "file:./dev.db";
  const adapter = new PrismaBetterSqlite3({ url });
  const prisma = new PrismaClient({ adapter });

  const slugMap: Record<string, string> = {
    广州: "guangzhou",
    深圳: "shenzhen",
    华为: "huawei",
  };
  const slug = slugMap[name] || name.toLowerCase();

  const existing = await prisma.entity.findUnique({
    where: { slug },
    include: { profile: true, reports: true, sources: true, newsArticles: true },
  });

  if (existing) {
    await prisma.entityReport.deleteMany({ where: { entityId: existing.id } });
    await prisma.entitySource.deleteMany({ where: { entityId: existing.id } });
    await prisma.newsArticle.deleteMany({ where: { entityId: existing.id } });
    await prisma.entityRelation.deleteMany({
      where: { OR: [{ fromEntityId: existing.id }, { toEntityId: existing.id }] },
    });
    if (existing.profile) {
      await prisma.entityProfile.delete({ where: { entityId: existing.id } });
    }
    await prisma.entity.delete({ where: { id: existing.id } });
    console.log(`Deleted existing: ${name}`);
  }

  console.log(`Regenerating ${name} with MiniMax + web search...`);
  const entity = await generateAndSaveEntity(name, {
    entityType: type,
    fetchNews: true,
    generateReport: true,
    publish: true,
  });

  console.log("Done:", entity.slug);
  console.log("Title:", entity.profile?.title);
  console.log("Summary:", entity.profile?.summary?.slice(0, 120));
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
