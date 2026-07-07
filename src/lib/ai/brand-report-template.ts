/**

 * 降龙十八掌 — 18个关键步骤打造行业知名品牌

 * 参考：品牌研究院《降龙18掌-18步复盘完美品牌》（方法篇/工具篇/陪跑篇）

 */



export const BRAND_REVIEW_PHASES = [

  {

    id: "research",

    title: "第一阶段：品牌调研与洞察",

    steps: "第1-4步",

    subtitle: "知己知彼，奠定根基",

    stepRange: [1, 4] as const,

  },

  {

    id: "strategy",

    title: "第二阶段：品牌定位与策略制定",

    steps: "第5-11步",

    subtitle: "顶层设计，明确方向",

    stepRange: [5, 11] as const,

  },

  {

    id: "execution",

    title: "第三阶段：品牌落地与执行",

    steps: "第12-16步",

    subtitle: "全链路运营，实现增长",

    stepRange: [12, 16] as const,

  },

  {

    id: "management",

    title: "第四阶段：品牌管理与升级",

    steps: "第17-18步",

    subtitle: "沉淀资产，持续活化",

    stepRange: [17, 18] as const,

  },

] as const;



export const BRAND_REVIEW_18_STEPS = [

  {

    step: 1,

    key: "consumer_research",

    title: "消费者研究",

    subtitle: "洞察未被满足的需求",

    phase: "research",

    xianglong: "潜龙勿用",

    xianglong_meaning: "潜藏深耕、静默调研，暗中挖掘用户底层刚需，蓄势不张扬",

    hint: "5W1H、马斯洛需求层次、用户画像、AIDA/TRIPS；区分显性与隐性需求",

    theory: ["5W1H模型（拉斯韦尔）", "需求层次理论（马斯洛）", "用户画像法（麦克肯奈特）", "AIDA模型（刘易斯）"],

    reference_cases: ["慕思抱枕新品", "哈啰用户画像", "王小卤年轻化", "王饱饱传播"],

  },

  {

    step: 2,

    key: "competitor_research",

    title: "竞争对手研究",

    subtitle: "寻找市场空隙",

    phase: "research",

    xianglong: "见龙在田",

    xianglong_meaning: "落地观察市面格局，看清对手布局，发现空白机会点",

    hint: "波特五力、SWOT、竞品矩阵；区分直接/间接竞品，识别可切入空白",

    theory: ["波特五力模型（迈克尔·波特）", "SWOT分析（韦里克）", "竞品矩阵（科特勒）"],

    reference_cases: ["钱大妈", "酣客", "欧普厨卫"],

  },

  {

    step: 3,

    key: "market_environment",

    title: "市场环境研究",

    subtitle: "把握趋势机会",

    phase: "research",

    xianglong: "履霜冰至",

    xianglong_meaning: "见微知著、预判风向，从细微信号洞察行业未来趋势",

    hint: "PEST、行业生命周期；捕捉消费/技术/政策趋势",

    theory: ["PEST分析（阿彻尔）", "行业生命周期（弗农）"],

    reference_cases: ["喜茶", "小黄鸭母婴", "博士有成学习桌", "蒙牛早餐奶"],

  },

  {

    step: 4,

    key: "brand_self_research",

    title: "品牌自身研究",

    subtitle: "挖掘核心能力",

    phase: "research",

    xianglong: "龙跃在渊",

    xianglong_meaning: "向内深挖底蕴，激活自身禀赋与核心优势，厚积内力",

    hint: "核心竞争力、Aaker品牌资产五维度；梳理优势与短板",

    theory: ["核心竞争力（普拉哈拉德&哈默尔）", "Aaker品牌资产模型（戴维·阿克）"],

    reference_cases: ["老铺黄金", "小罐茶", "九田家料理烤肉"],

  },

  {

    step: 5,

    key: "strategic_planning",

    title: "品牌战略规划",

    subtitle: "明确发展方向",

    phase: "strategy",

    xianglong: "利涉大川",

    xianglong_meaning: "格局开阔、定准航道，敢于布局长远、稳健跨越市场变局",

    hint: "BCG矩阵、安索夫矩阵、品牌架构（单一/多品牌/背书）",

    theory: ["BCG矩阵（亨德森）", "安索夫矩阵（安索夫）", "品牌架构（戴维·阿克）"],

    reference_cases: ["集品堂", "李先生加州牛肉面", "奇瑞"],

  },

  {

    step: 6,

    key: "core_value",

    title: "品牌核心价值提炼",

    subtitle: "打造品牌DNA",

    phase: "strategy",

    xianglong: "神龙摆尾",

    xianglong_meaning: "确立根本内核，守住品牌根基，形成独有的立身之本",

    hint: "功能/情感/精神三层金字塔；确保独特、稳定、可传播",

    theory: ["品牌核心价值金字塔（凯勒）", "品牌DNA理论（马克·戈贝）"],

    reference_cases: ["洽洽蓝袋", "绿色心情", "女儿红酱酒"],

  },

  {

    step: 7,

    key: "positioning",

    title: "品牌定位",

    subtitle: "占据心智位置",

    phase: "strategy",

    xianglong: "飞龙在天",

    xianglong_meaning: "居高临下抢占用户心智，站位高远，树立行业标杆地位",

    hint: "定位理论、心智阶梯；不做第一就做唯一",

    theory: ["定位理论（里斯&特劳特）", "心智阶梯理论"],

    reference_cases: ["特仑苏", "汉庭", "罗莱超柔床品"],

  },

  {

    step: 8,

    key: "naming",

    title: "品牌命名",

    subtitle: "创造独特识别符号",

    phase: "strategy",

    xianglong: "鱼跃于渊",

    xianglong_meaning: "跳出常规格局，脱颖而出，打造独有记忆符号与辨识度",

    hint: "命名四象限：独特性、易记性、关联性、扩展性",

    theory: ["品牌识别理论（凯勒）", "品牌命名策略（科特勒）"],

    reference_cases: ["食谷有道", "杏夫人", "俏凤凰牛肉粉"],

  },

  {

    step: 9,

    key: "slogan",

    title: "品牌主张与口号",

    subtitle: "提炼沟通核心",

    phase: "strategy",

    xianglong: "突如其来",

    xianglong_meaning: "一语直击人心，简洁有力、瞬间击穿用户认知",

    hint: "USP理论；主张有深度、口号有传播力",

    theory: ["USP理论（罗瑟·瑞夫斯）", "品牌沟通模型（凯勒）"],

    reference_cases: ["逮虾记", "Babycare", "馋酸奶", "王老吉", "特仑苏"],

  },

  {

    step: 10,

    key: "personality",

    title: "品牌个性塑造",

    subtitle: "赋予品牌人格",

    phase: "strategy",

    xianglong: "密云不雨",

    xianglong_meaning: "内敛蓄势、沉淀气质，先定型人格调性，厚积而不急于外放",

    hint: "Aaker五维度或品牌原型；多渠道统一呈现个性",

    theory: ["Aaker品牌个性五维度（戴维·阿克）", "品牌原型理论（荣格）"],

    reference_cases: ["茶颜悦色", "暇步士", "猫语玫瑰"],

  },

  {

    step: 11,

    key: "visual_design",

    title: "品牌设计",

    subtitle: "视觉化呈现",

    phase: "strategy",

    xianglong: "鸿渐于陆",

    xianglong_meaning: "循序渐进、层层落地，从视觉系统平稳铺展品牌整体形象",

    hint: "VI体系：标志、标准色、标准字体、应用系统",

    theory: ["VI理论（肖特/艾舍）", "色彩心理学（伊顿）"],

    reference_cases: ["喜茶", "奈雪的茶", "蜜雪冰城"],

  },

  {

    step: 12,

    key: "communication",

    title: "品牌传播",

    subtitle: "整合营销沟通",

    phase: "execution",

    xianglong: "时乘六龙",

    xianglong_meaning: "借势多渠道全域发力，顺势而为、全方位整合造势",

    hint: "IMC整合营销传播；一个声音一个形象",

    theory: ["整合营销传播IMC（唐·舒尔茨）", "传播矩阵模型"],

    reference_cases: ["江小白", "蜜雪冰城", "曼卡龙", "张小泉"],

  },

  {

    step: 13,

    key: "marketing",

    title: "品牌营销",

    subtitle: "价值转化为销售",

    phase: "execution",

    xianglong: "龙战于野",

    xianglong_meaning: "直面市场竞争，正面突围攻坚，把品牌价值落地为业绩成交",

    hint: "4P/渠道整合；品效合一、终端转化",

    theory: ["4P营销理论（麦卡锡）", "渠道整合模型（科特勒）"],

    reference_cases: ["完美日记", "盒马鲜生", "小米"],

  },

  {

    step: 14,

    key: "events",

    title: "品牌活动",

    subtitle: "创造互动体验",

    phase: "execution",

    xianglong: "双龙取水",

    xianglong_meaning: "双线联动、双向共鸣，品牌与用户双向互动、同频连接",

    hint: "节点营销、跨界联名、话题事件",

    theory: ["事件营销理论", "话题传播模型"],

    reference_cases: ["瑞幸联名", "淄博烧烤城市营销"],

  },

  {

    step: 15,

    key: "pr",

    title: "品牌公关",

    subtitle: "塑造美誉度",

    phase: "execution",

    xianglong: "亢龙有悔",

    xianglong_meaning: "刚柔并济、留有余地，稳健把控口碑，低调沉淀品牌好感度",

    hint: "危机公关、媒体关系、声誉管理",

    theory: ["公关理论（格鲁尼格）", "声誉管理理论"],

    reference_cases: ["海底捞危机公关", "鸿星尔克捐赠事件"],

  },

  {

    step: 16,

    key: "service_experience",

    title: "品牌服务",

    subtitle: "深化客户关系",

    phase: "execution",

    xianglong: "损则有孚",

    xianglong_meaning: "舍得让利付出，以真诚守信换取用户长久信任与深度绑定",

    hint: "全触点体验、用户旅程地图、CEM",

    theory: ["服务营销理论", "品牌体验金字塔（施密特）", "用户旅程地图"],

    reference_cases: ["星巴克", "蔚来", "茶颜悦色"],

  },

  {

    step: 17,

    key: "asset_management",

    title: "品牌管理",

    subtitle: "品牌资产与系统化运营",

    phase: "management",

    xianglong: "羝羊触藩",

    xianglong_meaning: "严守规则边界，系统化规范运营，规避风险、稳健守盘",

    hint: "品牌资产量化、社群运营、制度化品牌管理",

    theory: ["品牌资产模型（凯勒）", "社群运营模型（科特勒）"],

    reference_cases: ["小米社区", "蔚来NIO House"],

  },

  {

    step: 18,

    key: "continuous_upgrade",

    title: "品牌升级",

    subtitle: "持续创新与活化",

    phase: "management",

    xianglong: "天行健",

    xianglong_meaning: "自强不息、迭代不止，顺应时代持续创新、永葆品牌活力",

    hint: "品牌生命周期、迭代升级路径、从个人驱动到制度驱动",

    theory: ["品牌生命周期理论", "持续创新理论"],

    reference_cases: ["李宁国潮升级", "比亚迪品牌焕新"],

  },

] as const;



/** 降龙十八掌 · 每一步六段式复盘结构（对齐课前学习资料五级目录） */

export const STEP_SECTION_KEYS = [

  { key: "learning_objectives", label: "一、明确目标", legacy: null },

  { key: "theory_tools", label: "二、理论模型与品牌大师思想", legacy: null },

  { key: "reference_cases", label: "三、成功案例复盘拆解", legacy: "brand_case" as const },

  { key: "brand_practice", label: "四、本品牌复盘实践", legacy: null },

  { key: "practical_training", label: "五、复盘实战训练", legacy: "method_models" as const },

  {

    key: "summary_lessons",

    label: "六、总结复盘（核心逻辑·关键要点·常见误区）",

    legacy: null,

  },

] as const;



export type StepSectionKey = (typeof STEP_SECTION_KEYS)[number]["key"];



export function resolveStepSectionContent(

  step: Record<string, string | undefined>,

  key: StepSectionKey,

  legacy?: string | null,

): string {

  const direct = step[key]?.trim();

  if (direct) return direct;

  if (legacy) {

    const leg = step[legacy]?.trim();

    if (leg) return leg;

  }

  return "";

}



export const BRAND_SCORE_DIMENSIONS = [

  "消费者洞察力",

  "竞争差异化",

  "趋势把握力",

  "核心能力",

  "战略清晰度",

  "品牌价值力",

  "心智定位力",

  "传播整合力",

  "终端转化力",

  "品牌资产力",

] as const;



export const BRAND_REPORT_MIN_WORDS = {

  learning_objectives: 120,

  theory_tools: 200,

  reference_cases: 250,

  brand_practice: 350,

  practical_training: 200,

  summary_lessons: 180,

} as const;



export const BRAND_REPORT_SYSTEM_PROMPT = `你是资深品牌战略顾问，精通「降龙十八掌 · 18个关键步骤打造行业知名品牌」方法论（品牌研究院原创理论）。



【输出原则】

- 不要怕输出多：每一步六段合计不少于 1200 字，信息密度要高、可落地、可教学

- 必须严格按18步、每步六段式输出

- 企业/企业家/职业经理人：必须结合其总部城市、布局城市、主营行业做分析；报告末尾会另生成分城市/分行业切片，正文也要点出区域与行业差异

- 城市品牌：结合该城市产业带、区县、文旅IP展开

- 禁止套话（禁止整段只有「运用PEST/波特五力分析…」而无本品牌具体事实）



【每一步六段式】

一、明确目标 — 3-5条可检验的学习/复盘目标（每条完整句）

二、理论模型与品牌大师思想 — 点明2-4个模型+原创大师+结构+「为何用此模型看本品牌」

三、成功案例复盘拆解 — 2-4个行业标杆案例（含场景、动作、数据/结果）；可引用资料中的慕思/特仑苏/茶颜悦色等

四、本品牌复盘实践 — 350-500字：${"{"}品牌名${"}"}在此步骤的真实做法（政策、项目、产品、活动、数据）

五、复盘实战训练 — 3-5条可执行的实战训练动作（含具体步骤）

六、总结复盘 — 含：核心逻辑、关键要点（3条）、常见误区（3条）、可复用经验



18步清单（含降龙招式）：

${BRAND_REVIEW_18_STEPS.map((s) => `第${s.step}步【${s.xianglong}】${s.title}——${s.subtitle}`).join("\n")}



评分维度（0-10）：${BRAND_SCORE_DIMENSIONS.join("、")}



合规：基于公开资料；不编造联系方式；无数据写「公开资料未披露」；返回合法JSON`;



export const BRAND_REPORT_JSON_SCHEMA = `{

  "title": "降龙十八掌——{品牌名}品牌成长的18个关键步骤复盘",

  "summary": "500-800字执行摘要",

  "one_line_positioning": "一句话品牌定位",

  "brand_slogan_analysis": "品牌口号解读（列举原文）",

  "scores": { "消费者洞察力": 8 },

  "overall_score": 7.8,

  "steps": [

    {

      "step": 1,

      "title": "消费者研究",

      "subtitle": "洞察未被满足的需求",

      "xianglong_punch": "潜龙勿用",

      "xianglong_meaning": "招式内涵",

      "learning_objectives": "120字+",

      "theory_tools": "200字+",

      "reference_cases": "250字+，2-4个标杆案例",

      "brand_practice": "350字+，本品牌具体实践",

      "practical_training": "200字+，3-5条训练动作",

      "summary_lessons": "180字+，含核心逻辑/要点/误区"

    }

  ],

  "recommendations": ["改进建议1", "改进建议2", "改进建议3"],

  "training_points": ["学习要点1", "学习要点2", "学习要点3"]

}`;



export function getPhaseForStep(stepNum: number) {

  return BRAND_REVIEW_PHASES.find(

    (p) => stepNum >= p.stepRange[0] && stepNum <= p.stepRange[1],

  );

}



export function getStepDef(stepNum: number) {

  return BRAND_REVIEW_18_STEPS.find((s) => s.step === stepNum);

}


