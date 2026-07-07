import type { EntityType } from "@/lib/schemas/entity";

const CITY_NAMES = new Set([
  "北京", "上海", "广州", "深圳", "杭州", "成都", "苏州", "东莞", "佛山",
  "武汉", "长沙", "合肥", "南京", "重庆", "西安", "天津", "青岛", "厦门",
  "宁波", "无锡", "郑州", "济南", "福州", "大连", "珠海", "中山", "惠州",
]);

const COMPANY_SUFFIXES = ["公司", "集团", "科技", "有限", "股份", "控股", "实业"];

const KNOWN_COMPANIES = new Set([
  "华为", "腾讯", "比亚迪", "大疆", "迈瑞医疗", "蜜雪冰城", "胖东来",
  "名创优品", "字节跳动", "阿里巴巴", "小米", "宁德时代", "海尔",
  "格力", "美的", "万科", "平安", "招商银行", "中兴", "oppo", "vivo",
]);

const PROFESSION_KEYWORDS: Record<string, string> = {
  律师: "lawyer",
  医生: "doctor",
  教师: "teacher",
  讲师: "expert",
  专家: "expert",
  学生: "student",
};

export function detectEntityType(
  name: string,
  hint?: string,
): { type: EntityType; subtype?: string } {
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();

  if (hint && hint !== "auto") {
    return { type: hint as EntityType };
  }

  if (CITY_NAMES.has(trimmed) || trimmed.endsWith("市")) {
    return { type: "city" };
  }

  if (
    KNOWN_COMPANIES.has(trimmed) ||
    COMPANY_SUFFIXES.some((s) => trimmed.includes(s))
  ) {
    return { type: "company" };
  }

  if (trimmed.includes("品牌") || lower.includes("brand")) {
    return { type: "brand" };
  }

  for (const [kw, subtype] of Object.entries(PROFESSION_KEYWORDS)) {
    if (trimmed.includes(kw)) {
      return { type: "profession", subtype };
    }
  }

  if (/^[\u4e00-\u9fff]{2,4}$/.test(trimmed)) {
    return { type: "person", subtype: "entrepreneur" };
  }

  return { type: "company" };
}

export const SLUG_MAP: Record<string, string> = {
  深圳: "shenzhen", 广州: "guangzhou", 杭州: "hangzhou", 成都: "chengdu",
  苏州: "suzhou", 东莞: "dongguan", 佛山: "foshan", 武汉: "wuhan",
  长沙: "changsha", 合肥: "hefei", 北京: "beijing", 上海: "shanghai",
  华为: "huawei", 腾讯: "tencent", 比亚迪: "byd", 大疆: "dji",
  迈瑞医疗: "mindray", 蜜雪冰城: "mixue", 胖东来: "pangdonglai",
  名创优品: "miniso", 字节跳动: "bytedance", 小米: "xiaomi",
  任正非: "renzhengfei", 马化腾: "ponyma", 王传福: "wangchuanfu",
  汪滔: "wangtao", 雷军: "leijun", 俞敏洪: "yuminhong",
  董宇辉: "dongyuhui", 周鸿祎: "zhouhongyi", 何雪可: "hexueke-person",
};

export function entitySlug(name: string): string {
  if (SLUG_MAP[name]) return SLUG_MAP[name];
  const latin = name
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  if (latin.length >= 2) return latin;
  return `e-${Buffer.from(name).toString("hex").slice(0, 12)}`;
}
