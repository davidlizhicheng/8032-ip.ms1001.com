import { KNOWN_FAMOUS_PERSON_NAMES } from "@/lib/search/person-name-aliases";
import { getRegistryDisambiguation } from "@/lib/search/person-disambiguation-registry";

export type ParsedPersonQuery = {
  /** 用于百科检索的纯姓名 */
  personName: string;
  /** 用户原始输入（展示用） */
  displayName: string;
  /** 单位/公司线索，用于消歧与排序 */
  companyHint?: string;
};

const ORG_PATTERN =
  /[\u4e00-\u9fffA-Za-z0-9（）()·]{2,40}(?:公司|集团|大学|学院|研究院|基金会|科技|有限|股份|corporation|inc\.?|ltd\.?)/i;

/** 从「姓名 + 单位」混合输入中拆出检索用姓名 */
export function parsePersonQuery(rawName: string, companyHint?: string): ParsedPersonQuery {
  let input = rawName.trim();
  let company = companyHint?.trim() || undefined;

  const combined = input.match(
    /^([\u4e00-\u9fff·]{2,8})\s+([\u4e00-\u9fffA-Za-z0-9（）()·\s]{2,48}(?:公司|集团|科技|大学|研究院|有限|股份))$/,
  );
  if (combined) {
    input = combined[1];
    company = company || combined[2].trim();
  } else {
    const spaceSplit = input.match(/^([\u4e00-\u9fff·]{2,4})\s+(.+)$/);
    if (spaceSplit && !company) {
      const rest = spaceSplit[2].trim();
      if (ORG_PATTERN.test(rest) || rest.length >= 3) {
        input = spaceSplit[1];
        company = rest;
      }
    }
  }

  let personName = input.replace(/\s+/g, "");

  for (const famous of KNOWN_FAMOUS_PERSON_NAMES) {
    if (rawName.includes(famous) && famous.length >= 2) {
      personName = famous;
      break;
    }
  }

  if (personName.length > 6 && !company) {
    const head = personName.match(/^[\u4e00-\u9fff·]{2,4}/)?.[0];
    if (head) personName = head;
  }

  return {
    personName,
    displayName: rawName.trim(),
    companyHint: company,
  };
}

/** 单位线索是否出现在候选摘要中（用于消歧排序） */
export function companyHintMatchesCandidate(
  companyHint: string | undefined,
  candidate: { label?: string; company?: string; snippet?: string; summary?: string },
): boolean {
  if (!companyHint?.trim()) return false;
  const hint = companyHint.trim();
  const keys = [
    hint,
    hint.replace(/(?:有限|股份)?公司$/g, ""),
    hint.replace(/集团$/g, ""),
    hint.slice(0, 2),
  ].filter((k) => k.length >= 2);
  const blob = [candidate.label, candidate.company, candidate.snippet, candidate.summary]
    .filter(Boolean)
    .join(" ");
  return keys.some((k) => blob.includes(k));
}

export function rankCandidatesByCompanyHint<T extends { label?: string; company?: string; snippet?: string; summary?: string; confidence?: number }>(
  candidates: T[],
  companyHint?: string,
): T[] {
  if (!companyHint?.trim()) return candidates;
  return [...candidates].sort((a, b) => {
    const am = companyHintMatchesCandidate(companyHint, a) ? 1 : 0;
    const bm = companyHintMatchesCandidate(companyHint, b) ? 1 : 0;
    if (bm !== am) return bm - am;
    return (b.confidence || 0) - (a.confidence || 0);
  });
}

/** 百科 label 是否为同姓近音误匹配（如 李朝曙 vs 李朝东/李朝旭） */
export function isHomonymNameMismatch(labelName: string, personName: string): boolean {
  if (!labelName || !personName || labelName === personName) return false;
  if (personName.length >= 3 && labelName.length >= 3 && personName.slice(0, 2) === labelName.slice(0, 2)) {
    return labelName !== personName;
  }
  return false;
}

function primaryNameFromLabel(label: string): string {
  return (label.match(/^[\u4e00-\u9fff·]{2,4}/)?.[0] || "").replace(/·.*/, "").trim();
}

/** 过滤掉与检索姓名不符的百科误匹配候选 */
export function filterCandidatesByExactPersonName<
  T extends { id: string; source?: string; label?: string; snippet?: string; summary?: string },
>(candidates: T[], personName: string): T[] {
  return candidates.filter((c) => {
    if (c.source === "registry" || c.id === "self-provided" || c.source === "manual") return true;
    const label = c.label || "";
    const primary = primaryNameFromLabel(label);
    if (primary && isHomonymNameMismatch(primary, personName)) return false;
    const blob = `${label} ${c.snippet || ""} ${c.summary || ""}`;
    return blob.includes(personName);
  });
}

/**
 * 唯一高置信百科候选时自动锁定（知名人物/无歧义场景）
 * 注册表重名人物、同姓近音条目禁止自动锁定。
 */
export function pickAutoConfirmCandidateId(
  candidates: Array<{ id: string; source?: string; label?: string; company?: string; snippet?: string; summary?: string; confidence?: number }>,
  personName: string,
  companyHint?: string,
): string | null {
  if (getRegistryDisambiguation(personName)) return null;

  const real = filterCandidatesByExactPersonName(
    candidates.filter((c) => c.id !== "self-provided" && c.source !== "manual"),
    personName,
  );
  if (!real.length) return null;

  const ranked = rankCandidatesByCompanyHint(real, companyHint);
  const top = ranked[0];

  if (companyHint && companyHintMatchesCandidate(companyHint, top)) {
    const matches = ranked.filter((c) => companyHintMatchesCandidate(companyHint, c));
    if (matches.length === 1) return matches[0].id;
  }

  if (real.length === 1 && (top.source === "baike" || top.source === "wiki")) {
    const blob = `${top.label || ""}${top.snippet || ""}${top.summary || ""}`;
    const primary = primaryNameFromLabel(top.label || "");
    if (blob.includes(personName) && !isHomonymNameMismatch(primary, personName)) return top.id;
  }

  if (
    real.length >= 1 &&
    top.source === "baike" &&
    (top.confidence || 0) >= 0.85 &&
    (top.label || "").includes(personName)
  ) {
    const primary = primaryNameFromLabel(top.label || "");
    if (isHomonymNameMismatch(primary, personName)) return null;
    if (!companyHint || companyHintMatchesCandidate(companyHint, top)) return top.id;
    if (!companyHint && real.length === 1) return top.id;
  }

  return null;
}
