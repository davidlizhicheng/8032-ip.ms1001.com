/** 认领 / 名片认证规则（对外文案与校验） */

export const CLAIM_VERIFICATION_INTRO =
  "名片首次发布需管理员确认；确认后本人可随时修改维护。认领须提交认证材料并同意网站免责申明。";

export const CLAIM_REQUIREMENTS_LIST = [
  "执照或工牌",
  "公司前台/门头照片",
  "公司邮箱认证（回复即可）",
  "个人承诺",
  "网站免责申明",
] as const;

export const CLAIM_LARGE_COMPANY_HINT =
  "大型企业/知名公司：提供公司邮箱，管理员向该邮箱发送确认邮件，回复即可通过认证。";

export const CLAIM_SMALL_COMPANY_HINT =
  "中小企业：请上传营业执照或工牌，并补充 2 张公司前台/门头背景照片。";

export const CLAIM_PERSONAL_COMMITMENT_TEXT =
  "本人承诺所提交信息与材料真实有效，对名片/档案内容的真实性负责，并授权平台在审核通过后展示联系方式。";

export const CLAIM_WEBSITE_DISCLAIMER =
  "本人已阅读并同意网站免责申明：平台展示的品牌档案与名片由用户或 AI 整理生成，认证状态仅表示材料初审通过，不代替工商登记、行业协会或任何官方认证；信息仅供参考，争议以官方渠道为准。";

export const VERIFICATION_METHOD_LABELS: Record<string, string> = {
  license_or_badge: "执照或工牌",
  frontdesk_photos: "公司前台/门头照片",
  company_email: "公司邮箱认证（回复即可）",
  personal_commitment: "个人承诺",
  disclaimer: "网站免责申明",
};

export type ProofFile = {
  type: "license_or_badge" | "frontdesk" | "work_badge" | "other";
  url: string;
  title?: string;
};

export type ClaimVerificationInput = {
  companySize: "large" | "small";
  verificationMethod: string;
  contactEmail?: string;
  proofFiles?: ProofFile[];
  personalCommitment: boolean;
  disclaimerAccepted: boolean;
};

export function validateClaimVerification(input: ClaimVerificationInput): string | null {
  if (!input.personalCommitment) return "请勾选个人承诺";
  if (!input.disclaimerAccepted) return "请阅读并同意网站免责申明";

  if (input.companySize === "large") {
    const email = input.contactEmail?.trim();
    if (!email || !email.includes("@")) return "大公司认领请填写公司邮箱";
    if (input.verificationMethod !== "company_email") {
      return "大型企业请选择「公司邮箱认证」";
    }
    return null;
  }

  const proofs = input.proofFiles || [];
  const hasLicense = proofs.some((p) => p.type === "license_or_badge" || p.type === "work_badge");
  const frontdeskCount = proofs.filter((p) => p.type === "frontdesk").length;
  if (!hasLicense) return "中小企业请上传执照或工牌照片";
  if (frontdeskCount < 2) return "中小企业请上传至少 2 张公司前台/门头照片";
  return null;
}

export const CARD_FIRST_PUBLISH_HINT =
  "名片首次公开需管理员确认认证材料；确认后您可随时自行修改内容。";
