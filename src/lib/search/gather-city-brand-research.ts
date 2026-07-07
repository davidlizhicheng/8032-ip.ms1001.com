import {
  fetchAllBaikeEntries,
  fetchZhWikiEntry,
  formatEnrichedSource,
} from "@/lib/search/baike-fetcher";
import { formatSearchContext, searchWebMulti } from "@/lib/search/web-search";

/** 城市 18 步品牌复盘前的专项检索：口号、定位、政策、营销事件 */
export async function gatherCityBrandResearchContext(cityName: string): Promise<string> {
  const name = cityName.trim();
  const queries = [
    `${name} 城市品牌 宣传口号 定位 slogan`,
    `${name} 城市形象 品牌建设 传播语`,
    `${name} 公园城市 城市品牌`,
    `${name} 天府之国 城市IP 营销`,
    `${name} 美食之都 UNESCO 城市品牌`,
    `${name} 世界赛事名城 品牌`,
    `${name} 城市品牌建设 行动计划 site:gov.cn`,
    `${name} 城市宣传语 来了就不想走`,
    `${name} 蓉城 城市定位 产业`,
    `${name} site:baike.baidu.com 城市`,
  ];

  const [webResults, baikeEntries, wiki] = await Promise.all([
    searchWebMulti(queries, 5, 30),
    fetchAllBaikeEntries(name),
    fetchZhWikiEntry(name),
  ]);

  const blocks: string[] = [
    `【城市品牌复盘资料包 · ${name}】`,
    "以下资料用于撰写 18 步报告：必须引用其中的官方口号、称号、政策名、企业名、活动名与数据，禁止只写「运用某某模型」。",
  ];

  for (const [i, entry] of baikeEntries.slice(0, 3).entries()) {
    blocks.push(formatEnrichedSource(entry, i + 1));
  }
  if (wiki?.fullText || wiki?.snippet) {
    blocks.push(formatEnrichedSource(wiki, baikeEntries.length + 1));
  }

  if (webResults.length) {
    blocks.push(
      `【城市品牌 / 口号 / 政策 专项检索 ${webResults.length} 条】\n${formatSearchContext(webResults.slice(0, 24))}`,
    );
  }

  return blocks.join("\n\n").slice(0, 28000);
}

/** 成都等城市常见检索线索（提示 AI 在资料中查找，非硬编码正文） */
export const CITY_BRAND_RESEARCH_HINTS = `
城市品牌报告必须优先从资料中提取并写进正文（有则必写，无则说明「公开资料未载明」）：
- 官方/传播口号：如「来了就不想走的城市」「成都，一座来了就不想离开的城市」「公园城市·幸福成都」「天府成都·安逸」「成都，都成」等（以检索结果为准，逐条列出并解读）
- 国家级/国际称号： UNESCO「美食之都」、「设计之都」候选、「公园城市」首提地、西部金融中心、世界赛事名城等
- 标志性事件/IP：大运会、世界旅游联盟、糖酒会、春糖、熊猫IP、宽窄巷子、锦里、太古里、天府绿道、蓉城之秋等
- 产业与龙头：电子信息、生物医药、新能源汽车（一汽大众、沃尔沃、通威、新希望等，按资料写）
- 竞品城市：重庆、西安、杭州等在产业/文旅/消费上的差异（第2步竞品研究要写具体）
- 第9步「品牌主张与口号」：至少列举 3 条历史或现行口号，说明提出背景与传播场景
- 第7步「品牌定位」：写清「休闲之都→公园城市→幸福成都」等演进逻辑（若资料支持）
`.trim();
