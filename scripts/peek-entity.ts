import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const slug = process.argv[2] || "shenzhen";
const url = process.env.DATABASE_URL || "file:./dev.db";
const adapter = new PrismaBetterSqlite3({ url });
const prisma = new PrismaClient({ adapter });

async function main() {
  const e = await prisma.entity.findUnique({
    where: { slug },
    include: { profile: true },
  });
  if (!e?.profile) {
    console.log("Not found");
    return;
  }
  const c = JSON.parse(e.profile.contentJson);
  console.log("Title:", e.profile.title);
  console.log("Summary:", e.profile.summary);
  console.log("Section count:", c.sections?.length ?? 0);
  console.log("\nSections:");
  for (const s of c.sections || []) {
    console.log(`\n## ${s.title}\n${s.content}`);
  }
}

main().finally(() => prisma.$disconnect());
