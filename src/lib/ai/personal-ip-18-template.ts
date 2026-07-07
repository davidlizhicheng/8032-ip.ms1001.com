/**
 * 企业家与超级个体 · 个人品牌IP打造降龙18掌
 * 来源：品牌研究院系统手册（2026-07 docx）
 * 映射到 ReportStep 六段式字段：
 *   learning_objectives → 落地方法
 *   theory_tools → 专业模型
 *   reference_cases → 跨行业案例
 *   brand_practice → 针对本人物/单位的现状复盘
 *   practical_training → 原创金句 + 落地作业
 *   summary_lessons → 本掌核心要点
 */

export const PERSONAL_IP_PHASES = [
  {
    id: "root",
    title: "第一阶段：立根塑型",
    steps: "第1-4掌",
    subtitle: "定位、背书、简介、深度内容",
    stepRange: [1, 4] as const,
  },
  {
    id: "content",
    title: "第二阶段：内容升维",
    steps: "第5-8掌",
    subtitle: "著作、短视频、直播、演讲",
    stepRange: [5, 8] as const,
  },
  {
    id: "monetize",
    title: "第三阶段：商业变现",
    steps: "第9-12掌",
    subtitle: "课程、知识库、身份、荣誉",
    stepRange: [9, 12] as const,
  },
  {
    id: "expand",
    title: "第四阶段：破圈共生",
    steps: "第13-18掌",
    subtitle: "报道、传播、活动、公关、渠道、圈层",
    stepRange: [13, 18] as const,
  },
] as const;

export const PERSONAL_IP_SCORE_DIMENSIONS = [
  "定位清晰度",
  "信任背书力",
  "内容资产度",
  "公域破圈力",
  "私域沉淀力",
  "商业变现力",
  "媒体曝光度",
  "圈层资源力",
] as const;

export const PERSONAL_IP_STEP_SECTION_KEYS = [
  { key: "learning_objectives", label: "一、落地方法", legacy: null },
  { key: "theory_tools", label: "二、专业模型", legacy: null },
  { key: "reference_cases", label: "三、跨行业标杆案例", legacy: "brand_case" as const },
  { key: "brand_practice", label: "四、本人物/单位现状复盘", legacy: null },
  { key: "practical_training", label: "五、金句与落地作业", legacy: "method_models" as const },
  { key: "summary_lessons", label: "六、本掌核心要点", legacy: null },
] as const;

export const PERSONAL_IP_18_STEPS = [
  {
    step: 1,
    key: "positioning",
    title: "个人定位",
    subtitle: "IP立根，精准破局",
    phase: "root",
    xianglong: "第一掌",
    hint: "差异化卡位、痛点锚定、优势聚焦；T型/US P/三维定位模型",
    methods: ["差异化卡位法", "痛点锚定法", "优势聚焦法"],
    models: ["T型定位模型", "USP独特销售主张模型", "三维定位模型"],
    reference_cases: ["李筱懿·女性职场", "真功夫·中式蒸快餐", "科技美学·3C美学测评"],
    golden_quotes: [
      "定位不是讨好所有人，而是精准筛选对的人。",
      "泛IP必死，垂直细分方能长效出圈。",
    ],
  },
  {
    step: 2,
    key: "endorsement",
    title: "个人背书",
    subtitle: "信任筑基，赋能IP",
    phase: "root",
    xianglong: "第二掌",
    hint: "权威背书、成果背书、名人背书；信任金字塔、四维背书",
    methods: ["权威背书法", "成果背书法", "名人背书法"],
    models: ["信任背书金字塔模型", "四维背书模型", "场景化背书模型"],
    reference_cases: ["张金宝·财税", "刘畊宏·健身", "琚宾·设计"],
    golden_quotes: ["人设靠包装，信任靠背书。", "没有背书的IP，只是自我陶醉的人设。"],
  },
  {
    step: 3,
    key: "bio",
    title: "个人简介",
    subtitle: "一秒抓眼，留存用户",
    phase: "root",
    xianglong: "第三掌",
    hint: "价值前置、故事赋能、场景适配；黄金三段式简介",
    methods: ["价值前置法", "故事赋能法", "场景适配法"],
    models: ["黄金三段式简介模型", "痛点解决方案模型", "人设故事模型"],
    reference_cases: ["罗振宇", "崔玉涛", "老柴跨境"],
    golden_quotes: ["简介不说我是谁，只说我能帮你什么。", "简介是IP名片，一眼定生死。"],
  },
  {
    step: 4,
    key: "articles",
    title: "个人文章",
    subtitle: "深度沉淀，塑造专业",
    phase: "root",
    xianglong: "第四掌",
    hint: "观点输出、案例拆解、干货教程",
    methods: ["观点输出法", "案例拆解法", "干货教程法"],
    models: ["观点文三段式", "案例拆解五维模型", "干货清单模型"],
    reference_cases: ["吴晓波", "尹建莉", "粥左罗"],
    golden_quotes: ["短视频赢流量，长文章赢专业。", "一篇深度好文，胜过百条泛流量内容。"],
  },
  {
    step: 5,
    key: "books",
    title: "个人著作",
    subtitle: "IP升维，长效沉淀",
    phase: "content",
    xianglong: "第五掌",
    hint: "体系汇编、痛点著书、个人传记",
    methods: ["体系汇编法", "痛点著书法", "个人IP传记法"],
    models: ["书籍三维架构模型", "痛点闭环著书模型", "IP升维书籍模型"],
    reference_cases: ["刘润《底层逻辑》", "张德芬", "俞敏洪"],
    golden_quotes: ["短视频做短期流量，著作做终身IP。", "出书不是终点，是IP升维的起点。"],
  },
  {
    step: 6,
    key: "short_video",
    title: "个人短视频",
    subtitle: "公域破圈，流量引爆",
    phase: "content",
    xianglong: "第六掌",
    hint: "痛点短视频、人设剧情、热点借势；黄金3秒模型",
    methods: ["痛点短视频法", "人设剧情法", "热点借势法"],
    models: ["黄金3秒短视频模型", "人设短视频三连模型", "热点借势适配模型"],
    reference_cases: ["设计师阿爽", "密子君", "樊登读书"],
    golden_quotes: ["短视频的核心，是用最短时间解决最大痛点。", "持续高频输出，才能占据用户注意力。"],
  },
  {
    step: 7,
    key: "live",
    title: "个人直播",
    subtitle: "实时转化，强化信任",
    phase: "content",
    xianglong: "第七掌",
    hint: "干货直播、案例直播、连麦联动",
    methods: ["干货直播法", "案例直播法", "连麦联动直播法"],
    models: ["直播四步转化模型", "常态化直播运营模型", "连麦破圈模型"],
    reference_cases: ["董宇辉", "李叔凡律师", "东方甄选助农"],
    golden_quotes: ["短视频拉新，直播锁粉，实时信任胜过一切包装。", "优质直播，是IP最高效的变现通道。"],
  },
  {
    step: 8,
    key: "speech",
    title: "个人演讲",
    subtitle: "公域发声，拔高格局",
    phase: "content",
    xianglong: "第八掌",
    hint: "行业峰会、线下分享、主题专场演讲",
    methods: ["行业峰会演讲法", "线下分享演讲法", "主题专场演讲法"],
    models: ["演讲黄金结构模型", "行业发声模型", "感染力演讲模型"],
    reference_cases: ["雷军", "杨澜", "董明珠"],
    golden_quotes: ["演讲是IP格局的外放，是思想的公开发声。", "公域演讲立口碑，行业发声定圈层。"],
  },
  {
    step: 9,
    key: "courses",
    title: "个人课程",
    subtitle: "知识变现，体系固化",
    phase: "monetize",
    xianglong: "第九掌",
    hint: "痛点体系课、单点精品课、私教定制课",
    methods: ["痛点体系课法", "单点精品课法", "私教定制课法"],
    models: ["课程三阶架构模型", "痛点闭环课程模型", "高低配课程矩阵模型"],
    reference_cases: ["秋叶大叔", "大蓝", "杨路"],
    golden_quotes: ["课程是个人知识体系的商业化落地。", "分层课程矩阵，覆盖全域用户价值。"],
  },
  {
    step: 10,
    key: "knowledge_base",
    title: "个人知识库",
    subtitle: "私域沉淀，长效赋能",
    phase: "monetize",
    xianglong: "第十掌",
    hint: "内容归档、行业素材汇总、用户问答沉淀",
    methods: ["内容归档法", "行业素材汇总法", "用户问答沉淀法"],
    models: ["知识库四维分类模型", "动态更新模型", "赋能复用模型"],
    reference_cases: ["刘润", "粉笔张小龙", "肖逸群"],
    golden_quotes: ["知识库是个人IP的核心护城河。", "优质IP的底气，来自海量的知识沉淀。"],
  },
  {
    step: 11,
    key: "identity",
    title: "个人身份",
    subtitle: "人设分层，立体塑形",
    phase: "monetize",
    xianglong: "第十一掌",
    hint: "职业身份、社会身份、人格身份三维塑形",
    methods: ["职业身份固化法", "社会身份赋能法", "个人身份鲜活法"],
    models: ["三维身份模型", "身份适配场景模型", "身份递进成长模型"],
    reference_cases: ["张文宏", "李子柒", "曹德旺"],
    golden_quotes: ["单一身份显单薄，多层身份立立体IP。", "真实立体的身份，是IP长效存活的核心。"],
  },
  {
    step: 12,
    key: "honors",
    title: "个人荣誉",
    subtitle: "权威加冕，硬核背书",
    phase: "monetize",
    xianglong: "第十二掌",
    hint: "行业荣誉申报、社会荣誉争取、专业荣誉深耕",
    methods: ["行业荣誉申报法", "社会荣誉争取法", "专业荣誉深耕法"],
    models: ["荣誉分级模型", "荣誉场景运用模型", "荣誉迭代模型"],
    reference_cases: ["李飞飞", "张桂梅", "马可"],
    golden_quotes: ["荣誉是实力的官方认证，是IP的硬核铠甲。", "层层荣誉加持，步步IP升维。"],
  },
  {
    step: 13,
    key: "media",
    title: "个人报道",
    subtitle: "媒体赋能，全民出圈",
    phase: "expand",
    xianglong: "第十三掌",
    hint: "权威媒体投稿、媒体专访、热点事件报道",
    methods: ["权威媒体投稿法", "媒体专访合作法", "热点事件报道法"],
    models: ["媒体报道分层模型", "报道内容模型", "持续曝光模型"],
    reference_cases: ["钟薛高林盛", "李子柒", "九号机器人高禄峰"],
    golden_quotes: ["自我宣传有局限，媒体背书无边界。", "官方媒体赋能，让IP从小众走向大众。"],
  },
  {
    step: 14,
    key: "positive_buzz",
    title: "个人正向传播",
    subtitle: "流量放大，口碑裂变",
    phase: "expand",
    xianglong: "第十四掌",
    hint: "事件炒作、话题炒作、口碑炒作（正向）",
    methods: ["事件炒作法", "话题炒作法", "口碑炒作法"],
    models: ["正向事件传播模型", "话题热度引爆模型", "口碑裂变模型"],
    reference_cases: ["董明珠", "蜜雪冰城张红超", "帕梅拉"],
    golden_quotes: ["正向传播造热度，真实实力守口碑。", "话题引导流量，口碑沉淀IP。"],
  },
  {
    step: 15,
    key: "events",
    title: "个人活动",
    subtitle: "线下破圈，落地赋能",
    phase: "expand",
    xianglong: "第十五掌",
    hint: "自主主办、行业协办、用户专属活动",
    methods: ["自主主办活动法", "行业协办活动法", "用户专属活动法"],
    models: ["活动价值模型", "活动闭环模型", "活动梯度模型"],
    reference_cases: ["徐小平", "姬存希创始人", "樊登"],
    golden_quotes: ["线上做流量，线下做信任，活动做深耕。", "一场优质线下活动，胜过百次线上曝光。"],
  },
  {
    step: 16,
    key: "pr",
    title: "个人公关",
    subtitle: "舆情维稳，口碑护航",
    phase: "expand",
    xianglong: "第十六掌",
    hint: "前置舆情风控、负面危机公关、正向口碑维护",
    methods: ["前置舆情风控法", "负面舆情公关法", "正向公关维护法"],
    models: ["舆情风控三维模型", "危机公关5S模型", "口碑公关沉淀模型"],
    reference_cases: ["任正非", "刘德华", "海底捞"],
    golden_quotes: ["顶级的公关，是事前无风险，事中无慌乱。", "稳舆情方能稳口碑，守初心方能守IP。"],
  },
  {
    step: 17,
    key: "channels",
    title: "个人渠道",
    subtitle: "全域布局，流量闭环",
    phase: "expand",
    xianglong: "第十七掌",
    hint: "公域拓流、私域锁客、线下深耕",
    methods: ["公域渠道拓流法", "私域渠道锁客法", "线下渠道深耕法"],
    models: ["全域渠道闭环模型", "渠道适配模型", "渠道分级模型"],
    reference_cases: ["李佳琦", "马昌尧", "亲子摄影IP"],
    golden_quotes: ["公域做广度，私域做深度，线下做精度。", "渠道闭环，让流量不流失、价值可复用。"],
  },
  {
    step: 18,
    key: "network",
    title: "个人人脉圈层",
    subtitle: "高端破圈，资源共生",
    phase: "expand",
    xianglong: "第十八掌",
    hint: "价值换圈、圈层深耕、跨界链接",
    methods: ["价值换圈法", "圈层深耕法", "跨界链接法"],
    models: ["人脉圈层三阶模型", "价值人脉模型", "圈层分级运营模型"],
    reference_cases: ["沈南鹏", "鲁豫", "樊文花"],
    golden_quotes: ["人脉的本质，是长期对等的价值交换。", "高端圈层破圈，方能突破认知与资源瓶颈。"],
  },
] as const;

export const PERSONAL_IP_SYSTEM_PROMPT = `你是「企业家与超级个体个人品牌IP打造」资深顾问，精通降龙18掌方法论。
手册结构：每一掌含「落地方法、专业模型、跨行业案例、金句、落地作业」。
输出要求：
- 针对具体人物/企业家/超级个体，结合公开资料撰写个性化复盘
- 严禁空话套话；无资料处基于行业常识谨慎推断并标注
- 每掌六段式：落地方法(learning_objectives)、专业模型(theory_tools)、标杆案例(reference_cases)、本人物现状(brand_practice)、金句与作业(practical_training)、核心要点(summary_lessons)
- 案例段可引用手册标杆案例对比，但 brand_practice 必须写该人物自身
- 企业家/公司创始人优先从定位、背书、内容、变现、破圈全链路复盘`;

export function getPersonalIpPhaseForStep(stepNum: number) {
  return PERSONAL_IP_PHASES.find(
    (p) => stepNum >= p.stepRange[0] && stepNum <= p.stepRange[1],
  );
}

export function getPersonalIpStepDef(stepNum: number) {
  return PERSONAL_IP_18_STEPS.find((s) => s.step === stepNum);
}
