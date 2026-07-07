import type { EntityType } from "@/lib/schemas/entity";
import {
  BRAND_REPORT_SYSTEM_PROMPT,
  BRAND_REVIEW_18_STEPS,
  BRAND_REVIEW_PHASES,
  BRAND_SCORE_DIMENSIONS,
  STEP_SECTION_KEYS,
  getPhaseForStep,
  getStepDef,
} from "@/lib/ai/brand-report-template";
import {
  PERSONAL_IP_18_STEPS,
  PERSONAL_IP_PHASES,
  PERSONAL_IP_SCORE_DIMENSIONS,
  PERSONAL_IP_STEP_SECTION_KEYS,
  PERSONAL_IP_SYSTEM_PROMPT,
  getPersonalIpPhaseForStep,
  getPersonalIpStepDef,
} from "@/lib/ai/personal-ip-18-template";

export type ReportFrameworkId = "enterprise_brand" | "personal_ip";

export function getReportFrameworkId(type: EntityType): ReportFrameworkId {
  return type === "person" ? "personal_ip" : "enterprise_brand";
}

export function isPersonalIpReport(type: EntityType): boolean {
  return getReportFrameworkId(type) === "personal_ip";
}

export function getReportStepsForType(type: EntityType) {
  return isPersonalIpReport(type) ? PERSONAL_IP_18_STEPS : BRAND_REVIEW_18_STEPS;
}

export function getReportPhasesForType(type: EntityType) {
  return isPersonalIpReport(type) ? PERSONAL_IP_PHASES : BRAND_REVIEW_PHASES;
}

export function getReportSectionKeysForType(type: EntityType) {
  return isPersonalIpReport(type) ? PERSONAL_IP_STEP_SECTION_KEYS : STEP_SECTION_KEYS;
}

export function getReportScoreDimensionsForType(type: EntityType) {
  return isPersonalIpReport(type) ? PERSONAL_IP_SCORE_DIMENSIONS : BRAND_SCORE_DIMENSIONS;
}

export function getReportSystemPromptForType(type: EntityType): string {
  return isPersonalIpReport(type) ? PERSONAL_IP_SYSTEM_PROMPT : BRAND_REPORT_SYSTEM_PROMPT;
}

export function getPhaseForStepByType(stepNum: number, type: EntityType) {
  return isPersonalIpReport(type) ? getPersonalIpPhaseForStep(stepNum) : getPhaseForStep(stepNum);
}

export function getStepDefByType(stepNum: number, type: EntityType) {
  return isPersonalIpReport(type) ? getPersonalIpStepDef(stepNum) : getStepDef(stepNum);
}

export function reportTitleForEntity(name: string, type: EntityType): string {
  if (isPersonalIpReport(type)) {
    return `降龙18掌——${name}个人品牌IP打造复盘报告`;
  }
  return `降龙十八掌——${name}品牌成长的18个关键步骤复盘`;
}

export type UnifiedStepDef = {
  step: number;
  title: string;
  subtitle: string;
  xianglong: string;
  xianglong_meaning?: string;
  hint: string;
  reference_cases: readonly string[];
};

export type ReportSectionKeyDef = {
  key: string;
  label: string;
  legacy: string | null;
};

export function getUnifiedStepDefs(type: EntityType): UnifiedStepDef[] {
  if (isPersonalIpReport(type)) {
    return PERSONAL_IP_18_STEPS.map((s) => ({
      step: s.step,
      title: s.title,
      subtitle: s.subtitle,
      xianglong: s.xianglong,
      xianglong_meaning: s.subtitle,
      hint: s.hint,
      reference_cases: s.reference_cases,
    }));
  }
  return BRAND_REVIEW_18_STEPS.map((s) => ({
    step: s.step,
    title: s.title,
    subtitle: s.subtitle,
    xianglong: s.xianglong,
    xianglong_meaning: s.xianglong_meaning,
    hint: s.hint,
    reference_cases: s.reference_cases,
  }));
}
