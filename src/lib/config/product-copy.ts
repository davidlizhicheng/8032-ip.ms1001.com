/** 品牌网产品文案（对外展示） */
export const PRODUCT_WELCOME_TITLE = "欢迎加入全球品牌创新研究案例库与个人品牌名片库";

export const PRODUCT_SITE_NAMES = [
  "全球品牌创新名片网",
  "全球品牌创新研究案例库",
  "品牌影响力名片榜",
] as const;

export const PRODUCT_URL = "https://ip.ms1001.com/";

/** 场景 1：有公开报道的公众公司 / 公众人物 */
export const PRODUCT_SCENARIO_1 =
  "假如您是一家网上有公开报道的公众公司或一位公众人物，您只需在品牌案例生成入口输入贵公司名字或个人名字，AI 智能系统将自动生成公司/个人品牌研究报告与品牌名片；后续可提交相关证明，增加电话与联系方式，便于名片交换。";

/** 场景 2：暂无公开报道 — 自助填写内容生成，可自行修改 */
export const PRODUCT_SCENARIO_2 =
  "假如您是一家网上没有公开报道的公司，或一位企业家、专家等行业人士，您只需在「自助入驻」入口填写自己的介绍内容，AI 将据此生成品牌研究报告与个人/企业品牌名片；内容可随时自行修改，平台不做知名度核验。";

/** 场景 3：协会 / 总裁班批量 */
export const PRODUCT_SCENARIO_3 =
  "假如您是一家行业协会、社会组织或总裁班同学会，您只需在批量生成入口输入有公开报道的会员单位与个人名字，AI 智能系统将自动生成会员单位与个人的品牌研究报告与品牌名片，集中展示品牌形象、增进会员互相了解；后续可提交证明增加电话与联系方式。";

export const PRODUCT_SCENARIOS = [
  {
    key: "1",
    title: "有公开报道 · 公众公司 / 人物",
    desc: PRODUCT_SCENARIO_1,
    href: "/report/generate",
    cta: "进入品牌案例生成入口",
  },
  {
    key: "2",
    title: "暂无报道 · 自助填写生成",
    desc: PRODUCT_SCENARIO_2,
    href: "/start",
    cta: "进入自助入驻（推荐不知名用户）",
    highlight: true,
  },
  {
    key: "3",
    title: "协会 / 总裁班 · 批量会员",
    desc: PRODUCT_SCENARIO_3,
    href: "/admin/batch",
    cta: "进入批量生成入口",
  },
] as const;

export const PRODUCT_CTA =
  "系统将自动为您发布品牌报告与品牌名片，并向全球品牌界各界人士推荐，获得更大影响力！现在行动，领先一步加入全球品牌创新研究案例库与个人品牌名片库，放大你的影响力。";
