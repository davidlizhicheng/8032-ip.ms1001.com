import type { EnrichedSource } from "@/lib/search/baike-fetcher";
import type { ResearchStep } from "@/lib/search/research-types";
import type { PersonCandidate } from "@/lib/search/disambiguate-person";

/** 流水线阶段（查找与整合严格分离） */
export type PipelinePhase =
  | "receive"   // 1 收取用户输入
  | "name"      // 2 确定人名
  | "fetch"     // 3 查找信息（只抓事实，不写作）
  | "integrate" // 4 整合信息（AI 撰写）
  | "visual";   // 5 品牌 logo / 海报（可选）

export type PipelineStepLog = {
  phase: PipelinePhase;
  label: string;
  detail?: string;
  status: "running" | "done" | "skipped" | "error";
};

export type ReceivedUserInput = {
  rawText: string;
  charCount: number;
  enrichFromWeb: boolean;
};

export type ResolvedPersonName = {
  name: string;
  method: "regex" | "ai" | "user";
  confidence: "high" | "medium" | "low";
};

export type FactCategory =
  | "bio"
  | "education"
  | "career"
  | "achievement"
  | "organization"
  | "honor"
  | "brand"
  | "other";

/** 单条原子事实（第三步产出，供第四步整合） */
export type FactSnippet = {
  sourceType: "baike" | "wiki" | "web" | "gov";
  title: string;
  url: string;
  category: FactCategory;
  excerpt: string;
  relevanceScore: number;
};

/** 第三步：纯查找结果，禁止在此阶段调用「撰写型」AI */
export type PersonFactBundle = {
  name: string;
  identityHint: string;
  facts: FactSnippet[];
  /** 原始百科条目（供溯源与第四步格式化） */
  baikeEntries: EnrichedSource[];
  wiki: EnrichedSource | null;
  /** 第三通道：网页直爬正文 */
  webCrawlPages: EnrichedSource[];
  sourceCount: number;
  steps: PipelineStepLog[];
};

export type PersonPipelineOptions = {
  rawText: string;
  enrichFromWeb?: boolean;
  confirmedCandidateId?: string;
  confirmedIdentityHint?: string;
  onStep?: (step: PipelineStepLog) => void;
};

export type PersonPipelineResult =
  | {
      status: "needs_confirmation";
      name: string;
      reason: string;
      candidates: PersonCandidate[];
      allowCompare?: boolean;
      steps: PipelineStepLog[];
    }
  | {
      status: "ready";
      name: string;
      identityHint: string;
      factBundle: PersonFactBundle;
      steps: PipelineStepLog[];
    };
