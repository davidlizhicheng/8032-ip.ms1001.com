import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const slug = process.argv[2] || "shenzhen";
const url = process.env.DATABASE_URL || "file:./dev.db";
const adapter = new PrismaBetterSqlite3({ url });
const prisma = new PrismaClient({ adapter });

async function main() {
  const entity = await prisma.entity.findUnique({ where: { slug } });
  if (!entity) {
    console.log("Entity not found");
    return;
  }
  const report = await prisma.entityReport.findFirst({
    where: { entityId: entity.id },
    orderBy: { createdAt: "desc" },
  });
  if (!report) {
    console.log("No report");
    return;
  }
  const c = JSON.parse(report.contentJson);
  console.log("Title:", report.title);
  console.log("Steps count:", c.steps?.length ?? 0);
  const s1 = c.steps?.[0];
  if (s1) {
    console.log("\nStep 1:", s1.title);
    console.log("theory_tools:", s1.theory_tools?.slice(0, 200));
    console.log("brand_case:", s1.brand_case?.slice(0, 200));
  }
}

main().finally(() => prisma.$disconnect());
