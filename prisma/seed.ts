import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { generateAndSaveEntity } from "../src/lib/services/entity";

const url = process.env.DATABASE_URL || "file:./dev.db";
const adapter = new PrismaBetterSqlite3({ url });
const prisma = new PrismaClient({ adapter });

const CITIES = ["深圳", "广州", "杭州", "成都", "苏州"];
const COMPANIES = ["华为", "腾讯", "比亚迪", "大疆", "蜜雪冰城"];
const PERSONS = ["任正非", "马化腾", "王传福", "雷军", "董明珠"];

async function seedCard() {
  // 不再预置具体人物名片；由用户自行创建。
}

async function seedEntities() {
  const all: Array<{ name: string; type: string; subtype?: string }> = [
    ...CITIES.map((n) => ({ name: n, type: "city" })),
    ...COMPANIES.map((n) => ({ name: n, type: "company" })),
    ...PERSONS.map((n) => ({ name: n, type: "person", subtype: "entrepreneur" })),
  ];

  for (const item of all) {
    const slugMap: Record<string, string> = {
      深圳: "shenzhen", 广州: "guangzhou", 杭州: "hangzhou", 成都: "chengdu", 苏州: "suzhou",
      华为: "huawei", 腾讯: "tencent", 比亚迪: "byd", 大疆: "dji", 蜜雪冰城: "mixue",
      任正非: "renzhengfei", 马化腾: "ponyma", 王传福: "wangchuanfu", 雷军: "leijun", 董明珠: "dongmingzhu-person",
    };
    const slug = slugMap[item.name];
    if (!slug) continue;

    const exists = await prisma.entity.findUnique({ where: { slug } });
    if (exists) {
      console.log(`Skip existing: ${item.name}`);
      continue;
    }

    try {
      await generateAndSaveEntity(item.name, {
        entityType: item.type,
        subtype: item.subtype,
        fetchNews: false, // skip news in seed for speed
        generateReport: true,
        publish: true,
      });
      console.log(`Seeded entity: ${item.name}`);
    } catch (err) {
      console.error(`Failed ${item.name}:`, err);
    }
  }

  // Link person-company relations
  const links = [
    ["renzhengfei", "huawei", "创始人"],
    ["ponyma", "tencent", "创始人"],
    ["wangchuanfu", "byd", "创始人"],
  ];

  for (const [personSlug, companySlug, label] of links) {
    const person = await prisma.entity.findUnique({ where: { slug: personSlug } });
    const company = await prisma.entity.findUnique({ where: { slug: companySlug } });
    if (person && company) {
      await prisma.entityRelation.upsert({
        where: {
          fromEntityId_toEntityId_relationType: {
            fromEntityId: person.id,
            toEntityId: company.id,
            relationType: "founder",
          },
        },
        create: {
          fromEntityId: person.id,
          toEntityId: company.id,
          relationType: "founder",
          label,
        },
        update: {},
      }).catch(() => {});
    }
  }

  // Link companies to Shenzhen
  const shenzhen = await prisma.entity.findUnique({ where: { slug: "shenzhen" } });
  if (shenzhen) {
    for (const cSlug of ["huawei", "tencent", "byd", "dji"]) {
      const company = await prisma.entity.findUnique({ where: { slug: cSlug } });
      if (company) {
        await prisma.entityRelation.upsert({
          where: {
            fromEntityId_toEntityId_relationType: {
              fromEntityId: company.id,
              toEntityId: shenzhen.id,
              relationType: "headquartered_in",
            },
          },
          create: {
            fromEntityId: company.id,
            toEntityId: shenzhen.id,
            relationType: "headquartered_in",
            label: "总部所在",
          },
          update: {},
        }).catch(() => {});
      }
    }
  }
}

async function seedOrganizationGroups() {
  const demo = {
    slug: "demo-sz-entrepreneurs",
    name: "深圳企业家协会名片库",
    subtitle: "分会名片库 · 示例",
    description:
      "为会员单位提供统一品牌展示平台，一览各家企业品牌档案与核心人物名片，增进会员互相了解。",
    category: "chapter",
    isFeatured: true,
    manualRankOrder: 1,
    memberSlugs: [
      { slug: "huawei", role: "会长单位" },
      { slug: "tencent", role: "理事单位" },
      { slug: "byd", role: "理事单位" },
      { slug: "dji", role: "会员单位" },
      { slug: "renzhengfei", role: "名誉会长" },
      { slug: "ponyma", role: "副会长" },
    ],
  };

  const existing = await prisma.organizationGroup.findUnique({ where: { slug: demo.slug } });
  if (existing) {
    console.log(`Skip existing group: ${demo.name}`);
    return;
  }

  const group = await prisma.organizationGroup.create({
    data: {
      slug: demo.slug,
      name: demo.name,
      subtitle: demo.subtitle,
      description: demo.description,
      category: demo.category,
      visibility: "public",
      isFeatured: demo.isFeatured,
      manualRankOrder: demo.manualRankOrder,
    },
  });

  let order = 0;
  for (const item of demo.memberSlugs) {
    const entity = await prisma.entity.findUnique({ where: { slug: item.slug } });
    if (!entity) continue;
    await prisma.groupMember.create({
      data: {
        groupId: group.id,
        entityId: entity.id,
        memberRole: item.role,
        sortOrder: order++,
      },
    }).catch(() => {});
  }

  console.log(`Seeded organization group: ${demo.name}`);
}

async function main() {
  await seedCard();
  await seedEntities();
  await seedOrganizationGroups();
  console.log("Seed complete!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
