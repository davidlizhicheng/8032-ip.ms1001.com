import type { EntityType } from "@/lib/schemas/entity";

const PRIVATE_PATTERNS = [
  /1[3-9]\d{9}/,
  /微信[：:]\s*\S+/,
  /微信号[：:]\s*\S+/,
  /家庭住址/,
  /身份证/,
  /\d{17}[\dXx]/,
];

const EXAGGERATION_PATTERNS = [
  /包赢/,
  /百分百胜诉/,
  /最强律师/,
  /全国第一/,
  /绝对保证/,
];

export type RiskCheckResult = {
  passed: boolean;
  flags: string[];
};

export function checkContentRisk(
  content: string,
  entityType: EntityType,
  subtype?: string | null,
): RiskCheckResult {
  const flags: string[] = [];

  for (const pattern of PRIVATE_PATTERNS) {
    if (pattern.test(content)) {
      flags.push("contains_private_contact");
    }
  }

  if (entityType === "person" && subtype === "lawyer") {
    for (const pattern of EXAGGERATION_PATTERNS) {
      if (pattern.test(content)) {
        flags.push("legal_exaggeration");
      }
    }
  }

  if (entityType === "person" && (subtype === "student" || subtype === "youth_hero")) {
    if (/电话|手机|微信|住址/.test(content)) {
      flags.push("minor_contact_info");
    }
  }

  if (entityType === "person" && subtype === "official") {
    if (/招商|代言|商业合作|财富|资产/.test(content)) {
      flags.push("official_commercial_content");
    }
  }

  return { passed: flags.length === 0, flags };
}

export const AI_DISCLAIMER =
  "本页面由 AI 基于公开资料整理生成，未经本人或机构官方认证。信息仅供参考，如有异议请申请认领、纠错或下架。";

export const OFFICIAL_DISCLAIMER =
  "本页面基于公开职务信息整理，不代表本人或所在单位立场，非官方认证页面。仅展示政府官网及公开报道中的信息。";

export const MINOR_DISCLAIMER =
  "本页面为公开报道整理页，不涉及商业推广。未展示未成年人私人联系方式。";

export function getDisclaimer(
  entityType: EntityType,
  subtype?: string | null,
  isVerified?: boolean,
): string {
  if (isVerified) return "本页面已由相关方认领认证。";
  if (entityType === "person" && subtype === "official") return OFFICIAL_DISCLAIMER;
  if (entityType === "person" && (subtype === "student" || subtype === "youth_hero")) {
    return MINOR_DISCLAIMER;
  }
  return AI_DISCLAIMER;
}
