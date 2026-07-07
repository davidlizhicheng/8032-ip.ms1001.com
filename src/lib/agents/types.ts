import type { EntityType } from "@/lib/schemas/entity";

/** 流水线阶段 */
export type PipelineStage =
  | "entity_lock"
  | "research_plan"
  | "search"
  | "fetch"
  | "evidence"
  | "gap_check"
  | "writing"
  | "media"
  | "quality"
  | "done"
  | "error";

/** SSE / 进度事件类型 */
export type StreamEventType =
  | "status"
  | "source"
  | "section"
  | "token"
  | "image"
  | "video"
  | "done"
  | "error";

export type PipelineStreamEvent = {
  type: StreamEventType;
  stage?: PipelineStage;
  timestamp: string;
  data: Record<string, unknown>;
};

export type EntityLockResult = {
  name: string;
  type: EntityType;
  subtype?: string;
  identityHint?: string;
  confirmedCandidateId?: string;
  baikeUrl?: string;
  wikiUrl?: string;
  locked: boolean;
};

export type ResearchPlanQuery = {
  query: string;
  category: string;
  priority: number;
};

export type ResearchPlan = {
  entityName: string;
  entityType: EntityType;
  identityHint?: string;
  queries: ResearchPlanQuery[];
  requiredTopics: string[];
  createdAt: string;
};

export type EvidenceSource = {
  id: string;
  title: string;
  url: string;
  sourceType: "baike" | "wiki" | "web" | "gov" | "news" | "official";
  text: string;
  charCount: number;
  qualityScore: number;
  relevanceScore: number;
  tags: string[];
  usableSteps?: string[];
  gateNotes?: string[];
  fetchedAt: string;
};

export type EvidencePack = {
  entityName: string;
  entityType: EntityType;
  identityHint?: string;
  sources: EvidenceSource[];
  /** 高质量来源数（score >= 0.6） */
  highQualityCount: number;
  contextText: string;
  gaps: string[];
  readyForWriting: boolean;
};

export type MediaMatchResult = {
  coverUrl?: string;
  avatarUrl?: string;
  galleryImages: Array<{ url: string; type: string; title?: string; sectionId?: string; caption?: string }>;
  videos: Array<{
    platform: string;
    url: string;
    title?: string;
    coverUrl?: string;
    embedUrl?: string;
    canEmbed: boolean;
    sectionId?: string;
  }>;
};

export type ProductionPipelineInput = {
  name: string;
  entityType?: string;
  subtype?: string;
  confirmedCandidateId?: string;
  /** 人物检索时的单位线索（与 name 分开传，勿拼进百科检索词） */
  companyHint?: string;
  fetchNews?: boolean;
  generateReport?: boolean;
  publish?: boolean;
  visibility?: string;
  isOfficial?: boolean;
  isFeatured?: boolean;
  ownerUserId?: string;
};

export type ProductionPipelineResult = {
  entityId: string;
  slug: string;
  name: string;
  type: EntityType;
  evidencePack: EvidencePack;
  reportGenerated: boolean;
};

export type WritingResult = {
  entity: Awaited<ReturnType<typeof import("@/lib/ai/generate-entity").generateEntityContent>>;
  report?: Awaited<ReturnType<typeof import("@/lib/ai/generate-entity").generateReportContent>>;
};

export type PipelineContext = {
  jobId?: string;
  itemId?: string;
  onEvent?: (event: PipelineStreamEvent) => void;
};
