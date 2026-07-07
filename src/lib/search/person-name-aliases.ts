/** 常见简称 → 百度百科正式词条名（提高抓取命中率） */
export const PERSON_BAIKE_ALIASES: Record<string, string[]> = {
  马斯克: ["埃隆·马斯克", "伊隆·马斯克"],
  乔布斯: ["史蒂夫·乔布斯"],
  盖茨: ["比尔·盖茨"],
  贝索斯: ["杰夫·贝索斯"],
  扎克伯格: ["马克·扎克伯格"],
  库克: ["蒂姆·库克"],
  黄仁勋: ["黄仁勋"],
  雷军: ["雷军"],
  马云: ["马云"],
  马化腾: ["马化腾"],
  任正非: ["任正非"],
  巴菲特: ["沃伦·巴菲特"],
  特朗普: ["唐纳德·特朗普"],
  拜登: ["乔·拜登"],
  爱因斯坦: ["阿尔伯特·爱因斯坦"],
  牛顿: ["艾萨克·牛顿"],
  李白: ["李白"],
  杜甫: ["杜甫"],
  鲁迅: ["鲁迅"],
};

/** 人物图搜英文检索名（避免「马斯克」→「马」误匹配） */
export const PERSON_IMAGE_ENGLISH_ALIASES: Record<string, string> = {
  马斯克: "Elon Musk",
  埃隆·马斯克: "Elon Musk",
  伊隆·马斯克: "Elon Musk",
  乔布斯: "Steve Jobs",
  史蒂夫·乔布斯: "Steve Jobs",
  盖茨: "Bill Gates",
  比尔·盖茨: "Bill Gates",
  贝索斯: "Jeff Bezos",
  扎克伯格: "Mark Zuckerberg",
  库克: "Tim Cook",
  黄仁勋: "Jensen Huang",
  巴菲特: "Warren Buffett",
  特朗普: "Donald Trump",
  拜登: "Joe Biden",
  爱因斯坦: "Albert Einstein",
  牛顿: "Isaac Newton",
};

export function getPersonImageEnglishName(name: string): string | undefined {
  const trimmed = name.trim();
  return PERSON_IMAGE_ENGLISH_ALIASES[trimmed] ||
    PERSON_IMAGE_ENGLISH_ALIASES[expandPersonSearchNames(trimmed).find((a) => PERSON_IMAGE_ENGLISH_ALIASES[a]) || ""];
}

/** 检索时视为公众人物的简称（即使百科尚未抓取成功，也尝试自动配图/视频） */
export const KNOWN_FAMOUS_PERSON_NAMES = new Set([
  ...Object.keys(PERSON_BAIKE_ALIASES),
  ...Object.values(PERSON_BAIKE_ALIASES).flat(),
]);

/** 已知百科词条直链（简称检索易歧义时兜底） */
export const PERSON_BAIKE_DIRECT_URLS: Record<string, string[]> = {
  马斯克: ["https://baike.baidu.com/item/%E5%9F%83%E9%9A%86%C2%B7%E9%A9%AC%E6%96%AF%E5%85%8B/3776526"],
  乔布斯: ["https://baike.baidu.com/item/%E5%8F%B2%E8%92%82%E5%A4%AB%C2%B7%E4%B9%94%E5%B8%83%E6%96%AF"],
  盖茨: ["https://baike.baidu.com/item/%E6%AF%94%E5%B0%94%C2%B7%E7%9B%96%E8%8C%A8"],
  马云: ["https://baike.baidu.com/item/%E9%A9%AC%E4%BA%91"],
  雷军: ["https://baike.baidu.com/item/%E9%9B%B7%E5%86%9B"],
};

/** 必须排除的百科 URL（图书/衍生条目，非人物本身） */
export const PERSON_BAIKE_BLOCK_URLS: Record<string, string[]> = {
  马斯克: ["https://baike.baidu.com/item/%E5%9F%83%E9%9A%86%C2%B7%E9%A9%AC%E6%96%AF%E5%85%8B%E4%BC%A0/63409748"],
};

export function getDirectBaikeUrls(name: string): string[] {
  return PERSON_BAIKE_DIRECT_URLS[name.trim()] || [];
}

export function getBlockedBaikeUrls(name: string): string[] {
  return PERSON_BAIKE_BLOCK_URLS[name.trim()] || [];
}

export function expandPersonSearchNames(name: string): string[] {
  const trimmed = name.trim();
  const aliases = PERSON_BAIKE_ALIASES[trimmed] || [];
  return [trimmed, ...aliases.filter((a) => a !== trimmed)];
}

export function isKnownFamousName(name: string): boolean {
  const trimmed = name.trim();
  return KNOWN_FAMOUS_PERSON_NAMES.has(trimmed);
}
