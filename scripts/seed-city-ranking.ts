import { prisma } from "@/lib/prisma";
import { entitySlug } from "@/lib/ai/detect-type";

type CitySeed = {
  name: string;
  tier: "一线" | "新一线" | "二线" | "三线";
  score: number;
  slogan: string;
  summary: string;
};

const cities: CitySeed[] = [
  { name: "上海", tier: "一线", score: 96, slogan: "国际经济中心与城市品牌创新样板", summary: "上海以国际金融、贸易、航运、科创与消费品牌为核心，形成高能级城市品牌影响力。" },
  { name: "北京", tier: "一线", score: 95, slogan: "首都功能与全球创新资源高地", summary: "北京集聚总部经济、科技创新、文化传播与政务资源，城市品牌辨识度高。" },
  { name: "深圳", tier: "一线", score: 94, slogan: "创新之城，品牌出海高地", summary: "深圳以科技企业、产业链效率、设计创新和开放市场形成强品牌动能。" },
  { name: "广州", tier: "一线", score: 92, slogan: "千年商都，湾区消费与贸易枢纽", summary: "广州兼具商贸传统、制造根基、会展资源与湾区门户优势。" },
  { name: "杭州", tier: "新一线", score: 91, slogan: "数字经济与生活方式品牌之城", summary: "杭州以数字经济、文旅消费、民营经济和城市美学形成持续品牌声量。" },
  { name: "成都", tier: "新一线", score: 90, slogan: "来了就不想走的城市", summary: "成都把生活方式、文旅消费、产业承载和城市传播结合得较成熟。" },
  { name: "苏州", tier: "新一线", score: 89, slogan: "水韵苏州，创新未来", summary: "苏州以制造业、园区经济、江南文化和开放合作构成高质量城市品牌。" },
  { name: "南京", tier: "新一线", score: 88, slogan: "创新名城，美丽古都", summary: "南京兼具科教资源、历史文化、先进制造和省会辐射力。" },
  { name: "武汉", tier: "新一线", score: 87, slogan: "江城武汉，创新引领未来", summary: "武汉以科教、交通、光电子产业和中部枢纽定位形成品牌支撑。" },
  { name: "重庆", tier: "新一线", score: 86, slogan: "山水之城，美丽之地", summary: "重庆以山城地貌、制造基础、内陆开放和网红传播形成强记忆点。" },
  { name: "天津", tier: "新一线", score: 85, slogan: "津门门户，产业焕新", summary: "天津具备港口、制造、金融创新和京津冀协同优势。" },
  { name: "西安", tier: "新一线", score: 84, slogan: "千年古都，硬科技之城", summary: "西安以历史文化、科教资源、硬科技产业和文旅传播构建城市品牌。" },
  { name: "长沙", tier: "新一线", score: 83, slogan: "星城长沙，文化与现代交融之地", summary: "长沙凭借文娱消费、工程机械、新消费品牌和城市活力持续出圈。" },
  { name: "合肥", tier: "新一线", score: 82, slogan: "创新引领，绿色发展", summary: "合肥以新型显示、新能源汽车、量子信息和科创投资塑造新兴品牌形象。" },
  { name: "青岛", tier: "二线", score: 81, slogan: "海洋名城，品牌之都", summary: "青岛拥有海洋经济、制造品牌、啤酒节会和滨海文旅优势。" },
  { name: "宁波", tier: "二线", score: 80, slogan: "港通天下，制造强市", summary: "宁波以港口、外贸、制造业和民营经济形成务实城市品牌。" },
  { name: "佛山", tier: "二线", score: 79, slogan: "制造名城，岭南品牌", summary: "佛山以家电、陶瓷、装备制造和岭南文化构成产业品牌底盘。" },
  { name: "无锡", tier: "二线", score: 78, slogan: "太湖明珠，产业新城", summary: "无锡以物联网、先进制造、太湖文旅和民营经济形成稳定品牌资产。" },
  { name: "厦门", tier: "二线", score: 77, slogan: "高素质高颜值现代化国际化城市", summary: "厦门以滨海形象、会展贸易、文旅气质和开放门户提升品牌亲和力。" },
  { name: "郑州", tier: "二线", score: 76, slogan: "天地之中，枢纽之城", summary: "郑州以交通枢纽、商贸物流、先进制造和中原文化形成品牌基础。" },
  { name: "济南", tier: "二线", score: 75, slogan: "泉城济南，产业焕新", summary: "济南以泉水文化、省会资源、数字经济和产业升级形成城市认知。" },
  { name: "福州", tier: "二线", score: 74, slogan: "有福之州，数字应用之城", summary: "福州以海丝门户、数字中国建设峰会、侨乡资源和生态文旅塑造品牌。" },
  { name: "东莞", tier: "二线", score: 73, slogan: "制造之都，潮流东莞", summary: "东莞以制造供应链、外贸转型、潮玩产业和湾区协同形成新品牌势能。" },
  { name: "常州", tier: "二线", score: 72, slogan: "新能源之都，智造常州", summary: "常州以新能源产业链、先进制造和长三角协同形成鲜明产业标签。" },
  { name: "南昌", tier: "二线", score: 71, slogan: "英雄城，产业新势能", summary: "南昌以红色文化、航空产业、电子信息和省会资源构建品牌。" },
  { name: "昆明", tier: "二线", score: 70, slogan: "春城昆明，面向南亚东南亚门户", summary: "昆明以气候、文旅、花卉和开放门户形成差异化城市形象。" },
  { name: "温州", tier: "二线", score: 69, slogan: "民营经济之城，创业品牌高地", summary: "温州以民营经济、商帮文化、鞋服电气产业和创业精神形成品牌特色。" },
  { name: "南通", tier: "三线", score: 68, slogan: "江海门户，近沪强城", summary: "南通以江海联动、制造业、建筑业和长三角区位形成发展动能。" },
  { name: "泉州", tier: "三线", score: 67, slogan: "世遗之城，民营品牌之都", summary: "泉州以世遗文化、鞋服食品品牌、侨乡资源和民营经济构成影响力。" },
  { name: "烟台", tier: "三线", score: 66, slogan: "仙境海岸，制造烟台", summary: "烟台以滨海文旅、葡萄酒、装备制造和新能源产业形成品牌记忆。" },
  { name: "嘉兴", tier: "三线", score: 65, slogan: "红船起航地，长三角新城", summary: "嘉兴以红色文化、区位协同、先进制造和江南水乡形成复合品牌。" },
  { name: "绍兴", tier: "三线", score: 64, slogan: "越地风雅，产业更新", summary: "绍兴以黄酒、纺织、历史文化和长三角产业升级构建城市品牌。" },
  { name: "珠海", tier: "三线", score: 63, slogan: "青春之城，湾区门户", summary: "珠海以滨海环境、横琴联动、航展和高端制造提升城市品牌。" },
  { name: "中山", tier: "三线", score: 62, slogan: "伟人故里，湾区制造", summary: "中山以孙中山文化、灯饰产业、装备制造和湾区协同形成识别度。" },
  { name: "台州", tier: "三线", score: 61, slogan: "民营制造，山海台州", summary: "台州以民营制造、医药化工、汽车零部件和山海文旅形成品牌基础。" },
  { name: "惠州", tier: "三线", score: 60, slogan: "湾区东岸，山海惠州", summary: "惠州以电子信息、石化能源、生态文旅和湾区区位形成发展标签。" },
];

function scoreJson(score: number) {
  const scores = {
    品牌识别: score,
    创新动能: Math.max(50, score - 2),
    产业支撑: Math.max(50, score - 1),
    传播声量: Math.max(50, score - 3),
    文旅吸引: Math.min(99, score + 1),
  };
  return JSON.stringify({ overall: score, scores });
}

async function main() {
  await prisma.entity.updateMany({
    where: { ownerUserId: null, visibility: { not: "admin_hidden" } },
    data: { visibility: "public", status: "published" },
  });
  await prisma.card.updateMany({
    where: { userId: null, visibility: { not: "admin_hidden" } },
    data: { visibility: "public", status: "published" },
  });

  for (const city of cities) {
    const slug = entitySlug(city.name);
    const contentJson = JSON.stringify({
      sections: [
        { type: "positioning", title: "城市品牌定位", content: `${city.name}属于${city.tier}城市样本，当前系统评分为 ${city.score}。${city.summary}` },
        { type: "industry", title: "产业与创新支撑", content: `${city.name}的品牌影响力来自产业基础、消费场景、公共传播和城市服务体验的综合作用。` },
        { type: "tourism", title: "传播与正向形象", content: `${city.name}可围绕城市口号、代表产业、文旅体验和公共服务持续做正向传播。` },
      ],
      tags: [city.tier, "城市品牌", "公开榜单"],
      keywords: [city.name, "品牌影响力", "城市名片"],
    });

    const entity = await prisma.entity.upsert({
      where: { slug },
      create: {
        type: "city",
        name: city.name,
        slug,
        status: "published",
        visibility: "public",
        isFeatured: city.score >= 91,
        isOfficial: true,
        isAiGenerated: true,
        profile: {
          create: {
            title: city.name,
            subtitle: `${city.tier}城市品牌名片`,
            summary: city.summary,
            slogan: city.slogan,
            contentJson,
            theme: "business_gold_dark",
          },
        },
      },
      update: {
        status: "published",
        visibility: "public",
        isFeatured: city.score >= 91,
        isOfficial: true,
        profile: {
          upsert: {
            create: {
              title: city.name,
              subtitle: `${city.tier}城市品牌名片`,
              summary: city.summary,
              slogan: city.slogan,
              contentJson,
              theme: "business_gold_dark",
            },
            update: {
              title: city.name,
              subtitle: `${city.tier}城市品牌名片`,
              summary: city.summary,
              slogan: city.slogan,
              contentJson,
              theme: "business_gold_dark",
            },
          },
        },
      },
    });

    const reportData = {
      title: `${city.name}城市品牌影响力评分报告`,
      summary: `${city.name}当前系统评分 ${city.score}，用于首页与城市品牌库排名展示。`,
      contentJson: JSON.stringify({
        sections: [
          { title: "评分说明", content: "本评分基于城市能级、产业支撑、创新动能、传播声量与文旅吸引力的系统初评，后续可通过一键更新接入最新公开资料。" },
        ],
        steps: [],
      }),
      scoreJson: scoreJson(city.score),
    };
    const existingReport = await prisma.entityReport.findFirst({
      where: { entityId: entity.id, reportType: "city" },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (existingReport) {
      await prisma.entityReport.update({
        where: { id: existingReport.id },
        data: reportData,
      });
    } else {
      await prisma.entityReport.create({
        data: {
          entityId: entity.id,
          reportType: "city",
          ...reportData,
        },
      });
    }
  }

  console.log(`Seeded ${cities.length} city rankings and made existing platform content public.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
