import { prisma } from "@/lib/prisma";

const friendlySlugs: Array<{ type: string; name: string; slug: string }> = [
  { type: "company", name: "胖东来", slug: "pang-dong-lai" },
  { type: "person", name: "雷军", slug: "lei-jun" },
  { type: "person", name: "雷军 小米公司", slug: "leijun-xiaomi" },
];

async function main() {
  for (const item of friendlySlugs) {
    const row = await prisma.entity.findFirst({
      where: { type: item.type, name: item.name },
      select: { id: true, slug: true },
    });
    if (!row || row.slug === item.slug) continue;
    const conflict = await prisma.entity.findUnique({
      where: { slug: item.slug },
      select: { id: true },
    });
    if (conflict && conflict.id !== row.id) {
      console.log(`skip ${item.type}/${item.name}: slug ${item.slug} already used`);
      continue;
    }
    await prisma.entity.update({
      where: { id: row.id },
      data: { slug: item.slug },
    });
    console.log(`restored ${item.type}/${item.name}: ${row.slug} -> ${item.slug}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
