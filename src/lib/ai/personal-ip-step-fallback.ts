import { getPersonalIpStepDef } from "@/lib/ai/personal-ip-18-template";
import { excerptForSlot } from "@/lib/search/research-excerpt";

export type PersonalIpStepField =
  | "learning_objectives"
  | "theory_tools"
  | "reference_cases"
  | "brand_practice"
  | "practical_training"
  | "summary_lessons";

const FIELD_LABELS: Record<PersonalIpStepField, string> = {
  learning_objectives: "落地方法",
  theory_tools: "专业模型",
  reference_cases: "跨行业标杆案例",
  brand_practice: "本人物现状复盘",
  practical_training: "金句与落地作业",
  summary_lessons: "本掌核心要点",
};

function stepExcerpt(
  researchContext: string | undefined,
  personName: string,
  stepNum: number,
  hint: string,
  field: PersonalIpStepField,
  maxLen = 320,
): string {
  if (!researchContext?.trim()) return "";
  return (
    excerptForSlot(
      researchContext,
      `${hint} ${personName}`,
      stepNum * 41 + field.length * 7,
      maxLen,
    ) || ""
  );
}

/** AI 不可用时的个人 IP 分步兜底：每掌结构不同，避免 18 步粘贴同一段百科 */
export function buildPersonalIpFallbackField(
  personName: string,
  stepNum: number,
  field: PersonalIpStepField,
  researchContext?: string,
): string {
  const def = getPersonalIpStepDef(stepNum);
  if (!def) return "";

  const label = FIELD_LABELS[field];
  const excerpt = stepExcerpt(researchContext, personName, stepNum, def.hint, field);

  switch (field) {
    case "learning_objectives":
      return `【${label}】${def.xianglong}「${def.title}」——${def.subtitle}。手册方法：${def.methods.join("、")}。\n\n${personName}可对照：${def.hint}。${excerpt ? `\n\n公开资料相关摘录：${excerpt}` : `\n\n建议梳理${personName}在该维度的已有动作、渠道与可量化成果。`}`;

    case "theory_tools":
      return `【${label}】可运用 ${def.models.join("、")} 拆解${personName}的${def.title}。\n\n分析要点：优势是否聚焦、与目标受众是否匹配、是否与商业闭环衔接。${excerpt ? `\n\n资料线索：${excerpt}` : ""}`;

    case "reference_cases":
      return `【${label}】手册标杆：${def.reference_cases.join("、")}。\n\n对比${personName}：在「${def.title}」上，标杆的共同点是场景清晰、动作可复制、结果可验证；${personName}可借鉴其${def.hint.split("、")[0] || "打法"}，同时保留自身差异化。`;

    case "brand_practice":
      return `【${label}】${excerpt || `${personName}在「${def.title}」方面的公开信息有限，建议补充官网、社交账号、演讲与媒体报道后再做精细复盘。`}\n\n本掌关注点：${def.hint}。`;

    case "practical_training":
      return `【${label}】\n${def.golden_quotes.map((q) => `· ${q}`).join("\n")}\n\n落地作业：围绕「${def.title}」，为${personName}列出 3 条可在 30 天内执行的动作（含负责人/渠道/验收指标）。`;

    case "summary_lessons":
      return `【${label}】${def.xianglong} ${def.title}：${def.subtitle}。核心方法 ${def.methods.slice(0, 2).join("、")}；关键模型 ${def.models[0] || "见手册"}。${personName}本掌优先级——先补齐${def.hint.split("、")[0] || "基础资产"}，再迭代放大。`;

    default:
      return "";
  }
}

export function buildPersonalIpFallbackStep(
  personName: string,
  stepNum: number,
  researchContext?: string,
) {
  const def = getPersonalIpStepDef(stepNum);
  if (!def) return null;

  const fields: PersonalIpStepField[] = [
    "learning_objectives",
    "theory_tools",
    "reference_cases",
    "brand_practice",
    "practical_training",
    "summary_lessons",
  ];

  const step: Record<string, string | number> = {
    step: def.step,
    title: def.title,
    subtitle: def.subtitle,
    xianglong_punch: def.xianglong,
    xianglong_meaning: def.subtitle,
  };

  for (const field of fields) {
    step[field] = buildPersonalIpFallbackField(personName, stepNum, field, researchContext);
  }

  return step;
}
