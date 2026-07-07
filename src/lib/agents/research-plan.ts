import type { EntityType } from "@/lib/schemas/entity";
import type { ResearchPlan, ResearchPlanQuery } from "@/lib/agents/types";

const CITY_TOPICS = [
  "城市品牌",
  "城市口号",
  "文旅品牌",
  "公园城市",
  "赛事名城",
  "美食之都",
  "天府文化",
  "国际消费中心",
  "宣传片",
  "城市形象",
  "品牌传播 案例",
  "旅游局 官方",
  "文旅局 官方",
  "产业定位",
  "代表企业",
];

const PERSON_TOPICS = [
  "简介",
  "专访",
  "访谈",
  "演讲",
  "著作",
  "创业",
  "职务",
  "成就",
  "公益",
  "新闻",
];

const COMPANY_TOPICS = [
  "官网",
  "发展历程",
  "品牌战略",
  "企业文化",
  "研发投入",
  "年报",
  "品牌口号",
  "广告片",
  "创始人",
  "产品线",
  "代表产品",
];

function q(text: string, category: string, priority: number): ResearchPlanQuery {
  return { query: text, category, priority };
}

export function buildResearchPlan(
  entityName: string,
  entityType: EntityType,
  identityHint?: string,
): ResearchPlan {
  const hint = identityHint?.trim();
  const hintSuffix = hint && hint.length >= 3 ? ` ${hint}` : "";
  const queries: ResearchPlanQuery[] = [];

  if (entityType === "city") {
    for (const topic of CITY_TOPICS) {
      queries.push(q(`${entityName} ${topic}`, topic, topic.includes("官方") ? 10 : 7));
    }
    queries.push(q(`${entityName} site:gov.cn`, "政府官网", 10));
    queries.push(q(`${entityName} site:people.com.cn`, "主流媒体", 8));
  } else if (entityType === "person") {
    queries.push(q(`"${entityName}"`, "精确匹配", 10));
    for (const topic of PERSON_TOPICS) {
      queries.push(q(`"${entityName}" ${topic}`, topic, 8));
    }
    if (hint) {
      queries.push(q(`"${entityName}" ${hint}`, "身份限定", 9));
    }
    queries.push(q(`"${entityName}" site:people.com.cn`, "人民网", 8));
    queries.push(q(`"${entityName}" site:xinhuanet.com`, "新华网", 8));
    queries.push(q(`"${entityName}" site:thepaper.cn`, "澎湃", 7));
  } else if (entityType === "company") {
    for (const topic of COMPANY_TOPICS) {
      queries.push(q(`${entityName} ${topic}`, topic, topic === "官网" ? 10 : 7));
    }
    queries.push(q(`${entityName} site:gov.cn`, "政府/备案", 6));
  } else {
    queries.push(q(`${entityName} 简介`, "简介", 8));
    queries.push(q(`${entityName} 品牌 产品`, "品牌", 7));
    queries.push(q(`${entityName} 新闻`, "新闻", 7));
  }

  const requiredTopics =
    entityType === "city"
      ? ["城市口号", "文旅", "产业定位", "传播案例"]
      : entityType === "person"
        ? ["简介", "职务/经历", "成就/案例"]
        : entityType === "company"
          ? ["发展历程", "品牌定位", "代表产品"]
          : ["简介", "品牌定位"];

  return {
    entityName,
    entityType,
    identityHint: hint,
    queries: queries.sort((a, b) => b.priority - a.priority),
    requiredTopics,
    createdAt: new Date().toISOString(),
  };
}

export function planSearchQueries(plan: ResearchPlan, limit = 40): string[] {
  return plan.queries.slice(0, limit).map((q) => q.query);
}
