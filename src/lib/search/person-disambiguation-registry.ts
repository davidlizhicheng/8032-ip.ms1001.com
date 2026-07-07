import type { PersonCandidate } from "@/lib/search/disambiguate-person";

/** 注册表中的人物候选（含定向检索与消歧关键词） */
export type RegistryPersonCandidate = PersonCandidate & {
  region: string;
  identityHint: string;
  searchQueries: string[];
  /** 命中则排除的无关关键词（避免深圳/湖北串台） */
  excludeKeywords?: string[];
};

export type PersonDisambiguationEntry = {
  question: string;
  allowCompare: boolean;
  candidates: RegistryPersonCandidate[];
};

/** 已知重名/歧义人物：必须先确认再生成 */
export const PERSON_DISAMBIGUATION_REGISTRY: Record<string, PersonDisambiguationEntry> = {
  李朝曙: {
    question: "「李朝曙」是常见重名，请先确认是以下哪一位？选错会导致内容与人物完全无关。",
    allowCompare: true,
    candidates: [
      {
        id: "lichaoshu-shenzhen",
        label: "深圳 · 李朝曙",
        region: "广东深圳",
        title: "品牌与管理咨询专家",
        company: "深圳市品牌学会",
        snippet:
          "深圳品牌学会执行会长兼秘书长，管理咨询专家，著有《公司权力》，曾任《深圳特区报》教育周刊主编，长期从事深商品牌与企管培训。",
        identityHint: "广东深圳的品牌与管理咨询专家李朝曙，深圳市品牌学会执行会长，著有《公司权力》，非政府官员",
        searchQueries: [
          "李朝曙 深圳 品牌学会",
          "李朝曙 管理咨询 公司权力",
          "李朝曙 深圳特区报 企管",
          "李朝曙 深商品牌 讲座",
        ],
        excludeKeywords: ["赤壁", "咸宁", "市长", "秘书长 咸宁", "湖北省"],
      },
      {
        id: "lichaoshu-hubei",
        label: "湖北 · 李朝曙",
        region: "湖北",
        title: "原赤壁市市长 / 咸宁市政府秘书长",
        company: "湖北省赤壁市 / 咸宁市政府",
        snippet:
          "湖北籍公职人员，曾任赤壁市市长、咸宁市政府秘书长等职务，与深圳品牌咨询领域李朝曙为不同人物。",
        identityHint: "湖北赤壁市原市长、咸宁市政府秘书长李朝曙，公职人员，与深圳品牌咨询专家不是同一人",
        searchQueries: [
          "李朝曙 赤壁 市长",
          "李朝曙 咸宁 秘书长",
          "李朝曙 湖北省 赤壁市",
        ],
        excludeKeywords: ["品牌学会", "管理咨询", "公司权力", "深圳特区报", "深商", "费曼学习"],
      },
    ],
  },
};

export function normalizePersonName(name: string): string {
  return name.trim().replace(/\s/g, "");
}

export function getRegistryDisambiguation(name: string): PersonDisambiguationEntry | null {
  const key = normalizePersonName(name);
  return PERSON_DISAMBIGUATION_REGISTRY[key] || null;
}

export function resolveRegistryCandidate(
  name: string,
  candidateId: string,
): RegistryPersonCandidate | null {
  const entry = getRegistryDisambiguation(name);
  if (!entry) return null;
  return entry.candidates.find((c) => c.id === candidateId) || null;
}

export function registryCandidatesAsPersonCandidates(
  entry: PersonDisambiguationEntry,
): PersonCandidate[] {
  return entry.candidates.map(({ id, label, title, company, snippet, url }) => ({
    id,
    label,
    title,
    company,
    snippet,
    url,
  }));
}
