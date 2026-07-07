import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { generateAndSaveEntity } from "../src/lib/services/entity";

const url = process.env.DATABASE_URL || "file:./dev.db";
const adapter = new PrismaBetterSqlite3({ url });
const prisma = new PrismaClient({ adapter });

const CITIES = ["深圳", "广州", "杭州", "成都", "苏州"];
const COMPANIES = ["华为", "腾讯", "比亚迪", "大疆", "蜜雪冰城"];
const PERSONS = ["任正非", "马化腾", "王传福", "雷军", "何雪可"];

async function seedCard() {
  const existing = await prisma.card.findUnique({ where: { slug: "hexueke" } });
  if (existing) return;

  await prisma.card.create({
    data: {
      slug: "hexueke",
      name: "何雪可",
      title: "董事长助理 / 项目总监",
      company: "深圳市超级品牌顾问有限公司",
      brandSlogan: "超级品牌战略咨询，帮助企业打造增长型品牌",
      bio: "长期参与企业品牌咨询与项目管理，服务企业品牌升级与增长转型。",
      phone: "18820289859",
      email: "coco@chaojipinpai.com",
      address: "深圳市",
      theme: "business_gold_dark",
      status: "published",
      sections: {
        create: [
          { type: "business", title: "业务介绍", content: "品牌战略、品牌营销、爆品打造、企业增长咨询", sortOrder: 0 },
          { type: "experience", title: "过往经历", content: "担任深圳市超级品牌顾问有限公司董事长助理", sortOrder: 1 },
        ],
      },
    },
  });
  console.log("Seeded card: /u/hexueke");
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
      任正非: "renzhengfei", 马化腾: "ponyma", 王传福: "wangchuanfu", 雷军: "leijun", 何雪可: "hexueke-person",
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

async function main() {
  await seedCard();
  await seedEntities();
  console.log("Seed complete!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
