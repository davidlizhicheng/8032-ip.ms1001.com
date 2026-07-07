import { prisma } from "@/lib/prisma";

const name = "深圳市了不起品牌管理有限公司";
const slug = "amazing-brand-shenzhen";
const logoUrl = "https://company.ms1001.com/assets/logo.jpg";

const contentJson = JSON.stringify({
  sections: [
    {
      type: "intro",
      title: "公司简介",
      content:
        "深圳市了不起品牌管理有限公司面向企业、城市与人物IP，提供品牌研究、品牌课程、案例报告、传播内容和AI品牌工具服务。公司与AI.MS1001.COM、品牌网、制课网、海报网等工具矩阵联动，形成研究、内容、工具、传播一体化的品牌服务闭环。",
    },
    {
      type: "leadership",
      title: "公司领导",
      content:
        "李朝曙为公司老板，深圳市品牌学会秘书长，科特勒咨询集团及北大纵横、品牌中国特邀专家。公开资料显示，李朝曙曾任深圳市管理咨询行业协会执行秘书长，曾为富安娜、润迅通讯、百联集团等行业品牌提供顾问或培训讲师服务，并担任《培训》杂志编委。",
    },
    {
      type: "leadership",
      title: "CTO：李之城",
      content:
        "李之城负责AI智能体开发与应用方向。其公开简历显示，他就读于深圳理工大学计算机科学与人工智能专业，长期关注AI智能体、RAG知识库、AI应用开发和企业场景落地，已独立或主导搭建约25个AI应用原型，覆盖AI招聘、AI教育、企业培训、知识库问答、日程管理、品牌网和智能体开发教学等方向。",
    },
    {
      type: "products",
      title: "著作与课程资料",
      content:
        "李朝曙代表作品包括《公司权力》《出牌》《关键时刻留住顾客》等财经管理著作。其中《公司权力》由中国档案出版社2005年出版，围绕公司权力构成及如何正确行使公司权力展开；《出牌》围绕企业营销理念与方法展开。公司后续可继续补充封面、ISBN、课程照片与授权链接。",
    },
    {
      type: "brand",
      title: "公众号矩阵",
      content:
        "公司公众号矩阵包括：了布起星球、了布起研究院、了不起知识库。暂无二维码时可先使用公司Logo代替，后续通过后台上传正式二维码。",
    },
    {
      type: "cooperation",
      title: "联系方式",
      content:
        "品牌研究、课程合作、案例报告、AI工具矩阵与企业品牌咨询可联系邮箱：84150217@qq.com。",
    },
  ],
  tags: ["深圳品牌", "品牌研究", "AI品牌工具", "深圳市品牌学会"],
  keywords: [name, "李朝曙", "李之城", "了不起品牌", "品牌案例研究"],
});

async function main() {
  const existing = await prisma.entity.findFirst({ where: { type: "company", name } });
  const profileData = {
    title: name,
    subtitle: "深圳市品牌学会相关品牌研究、课程与AI品牌工具服务",
    summary:
      "面向企业、城市与人物IP，提供品牌研究、品牌课程、案例传播与AI品牌工具服务。",
    slogan: "把品牌研究、案例传播和AI工具做成一套增长系统。",
    avatarUrl: logoUrl,
    coverUrl: logoUrl,
    contentJson,
    theme: "brand_orange",
  };
  const baseData = {
    type: "company",
    name,
    slug,
    status: "published",
    visibility: "public",
    isFeatured: true,
    isOfficial: true,
    isAiGenerated: false,
  };

  const entity = existing
    ? await prisma.entity.update({
        where: { id: existing.id },
        data: {
          ...baseData,
          profile: { upsert: { create: profileData, update: profileData } },
        },
      })
    : await prisma.entity.create({
        data: {
          ...baseData,
          profile: { create: profileData },
        },
      });

  await prisma.mediaAsset.create({
    data: {
      entityId: entity.id,
      url: logoUrl,
      type: "cover",
      title: "公司Logo",
    },
  }).catch(() => null);

  console.log(`Seeded ${name}: /company/${entity.slug}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
