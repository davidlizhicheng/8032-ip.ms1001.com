/** 首页「18步报告样例」指向的已生成实体（当前：胖东来） */
export const SHOWCASE_BRAND_REPORT = {
  type: "company" as const,
  slug: "pang-dong-lai",
  name: "胖东来",
};

export function showcaseReportPath(): string {
  const { type, slug } = SHOWCASE_BRAND_REPORT;
  return `/report/${type}/${slug}`;
}
