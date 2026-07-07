import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const slug = process.argv[2] || "pang-dong-lai";
const feature = !process.argv.includes("--no-feature");

async function main() {
  const entity = await prisma.entity.findUnique({ where: { slug } });
  if (!entity) {
    console.error("Not found:", slug);
    process.exit(1);
  }

  await prisma.entity.update({
    where: { id: entity.id },
    data: {
      status: "published",
      visibility: "public",
      ...(feature ? { isFeatured: true } : {}),
    },
  });

  console.log(`Published: ${entity.name} (${slug})`);
  console.log(`Featured: ${feature}`);
  const port = process.env.PORT || "3002";
  const base = `http://127.0.0.1:${port}`;
  console.log(`Homepage: ${base}/`);
  console.log(`Company: ${base}/company/${slug}`);
  console.log(`Report: ${base}/report/company/${slug}`);
  console.log(`Library: ${base}/library/company`);
}

main().finally(() => prisma.$disconnect());
