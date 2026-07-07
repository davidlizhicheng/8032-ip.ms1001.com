import { decodeHtmlEntities } from "@/lib/content/decode-html";
import { coerceText } from "@/lib/content/coerce-text";

/** 禁止出现在用户可见内容中的占位话术 */

export const PLACEHOLDER_PATTERNS = [
  /待补充/,
  /待认证方/,
  /待完善/,
  /公开资料未明确提及/,
  /公开资料不足/,
  /资料待完善/,
  /资料不足/,
  /认领后可上传/,
  /差异化策略在市场中建立独特认知/,
  /聚焦核心客群.*强化品牌记忆点/,
  /集聚众多行业龙头/,
  /历史文化与现代都市风貌交融/,
  /待抓取/,
  /相关.*动态（待/,
  /运用.{2,24}(模型|理论).{0,40}分析.{0,16}在.{0,20}环节的策略选择/,
  /分析.{0,8}在.{0,20}环节的策略选择与底层逻辑/,
  /等理论工具，分析.{0,20}在「/,
  /将理论转化为可执行的品牌战略动作，贯穿产品、传播与终端体验/,
  /通过差异化策略在市场中建立独特认知/,
  /采用结构化复盘模型，从.{0,30}等维度进行系统拆解/,
];

export function isPlaceholderContent(text?: string | null | unknown): boolean {
  const value = coerceText(text);
  if (!value.trim()) return true;
  return PLACEHOLDER_PATTERNS.some((p) => p.test(value));
}

export function sanitizeText(text?: string | null | unknown): string {
  const value = coerceText(text);
  if (!value.trim()) return "";
  const decoded = decodeHtmlEntities(value);
  if (isPlaceholderContent(decoded)) return "";
  return decoded.trim();
}

export function sanitizeSections<T extends { title: string; content: string; type?: string }>(
  sections: T[],
): T[] {
  return sections.filter(
    (s) => s.content.trim().length >= 30 && !isPlaceholderContent(s.content),
  );
}
