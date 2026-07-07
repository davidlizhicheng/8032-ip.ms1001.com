import { z } from "zod";

export const ENTITY_TYPES = [
  "city",
  "company",
  "person",
  "brand",
  "profession",
] as const;

export type EntityType = (typeof ENTITY_TYPES)[number];

export const PERSON_SUBTYPES = [
  "entrepreneur",
  "executive",
  "expert",
  "lawyer",
  "doctor",
  "teacher",
  "student",
  "youth_hero",
  "tech_talent",
  "founder",
  "investor",
  "influencer",
  "association_leader",
  "official",
] as const;

export type PersonSubtype = (typeof PERSON_SUBTYPES)[number];

export const ProfileSectionSchema = z.object({
  type: z.string(),
  title: z.string(),
  content: z.string(),
});

export const GeneratedEntitySchema = z.object({
  slug: z.string(),
  name: z.string(),
  type: z.enum(ENTITY_TYPES),
  subtype: z.string().optional(),
  title: z.string(),
  subtitle: z.string().optional(),
  slogan: z.string(),
  summary: z.string(),
  sections: z.array(ProfileSectionSchema),
  tags: z.array(z.string()),
  keywords: z.array(z.string()),
  seo_title: z.string(),
  seo_description: z.string(),
  theme: z.string().default("business_gold_dark"),
  relations: z
    .array(
      z.object({
        target_name: z.string(),
        target_type: z.enum(ENTITY_TYPES),
        relation_type: z.string(),
        label: z.string().optional(),
      }),
    )
    .optional(),
  sources: z
    .array(
      z.object({
        title: z.string(),
        url: z.string().optional(),
        source_type: z.string(),
        excerpt: z.string().optional(),
        confidence_score: z.number().min(0).max(1).default(0.5),
      }),
    )
    .optional(),
});

export type GeneratedEntity = z.infer<typeof GeneratedEntitySchema>;

export const ReportScoreSchema = z.record(z.string(), z.number().min(0).max(10));

export const ReportStepSchema = z.object({
  step: z.number().min(1).max(18),
  title: z.string(),
  subtitle: z.string().optional(),
  xianglong_punch: z.string().optional(),
  xianglong_meaning: z.string().optional(),
  learning_objectives: z.string().optional(),
  theory_tools: z.string(),
  reference_cases: z.string().optional(),
  brand_practice: z.string(),
  practical_training: z.string().optional(),
  summary_lessons: z.string(),
  /** @deprecated å…¼å®¹æ—§æŠ¥å‘Š */
  method_models: z.string().optional(),
  /** @deprecated å…¼å®¹æ—§æŠ¥å‘Š */
  brand_case: z.string().optional(),
});

export type ReportStep = z.infer<typeof ReportStepSchema>;

export const ReportSegmentSchema = z.object({
  id: z.string(),
  label: z.string(),
  dimension: z.enum(["city", "industry", "city_industry"]),
  city: z.string().optional(),
  industry: z.string().optional(),
  summary: z.string(),
  step_insights: z
    .array(
      z.object({
        step: z.number().min(1).max(18),
        title: z.string(),
        insight: z.string(),
      }),
    )
    .optional(),
  deep_steps: z.array(ReportStepSchema).optional(),
});

export type ReportSegment = z.infer<typeof ReportSegmentSchema>;

export const GeneratedReportSchema = z.object({
  title: z.string(),
  summary: z.string(),
  scores: ReportScoreSchema,
  sections: z
    .array(z.object({ title: z.string(), content: z.string() }))
    .optional(),
  steps: z.array(ReportStepSchema).optional(),
  segments: z.array(ReportSegmentSchema).optional(),
  segment_dimensions: z
    .object({
      cities: z.array(z.string()).optional(),
      industries: z.array(z.string()).optional(),
    })
    .optional(),
  recommendations: z.array(z.string()),
  overall_score: z.number().min(0).max(10),
  training_points: z.array(z.string()).optional(),
  brand_slogan_analysis: z.string().optional(),
  one_line_positioning: z.string().optional(),
});

export type GeneratedReport = z.infer<typeof GeneratedReportSchema>;

export const BatchJobSchema = z.object({
  names: z.string().min(1),
  entityType: z.string().default("auto"),
  generatePage: z.boolean().default(true),
  generateReport: z.boolean().default(true),
  fetchNews: z.boolean().default(true),
  personSubtype: z.string().optional(),
  /** Person identity confirmation. Backward compatible with { name: candidateId }. */
  personCandidates: z
    .record(
      z.string(),
      z.union([
        z.string(),
        z.object({
          id: z.string(),
          url: z.string().optional(),
          source: z.string().optional(),
          label: z.string().optional(),
        }),
      ]),
    )
    .optional(),
});

export const ClaimRequestSchema = z.object({
  entityId: z.string(),
  claimType: z.enum(["person", "company", "city", "brand"]),
  companySize: z.enum(["large", "small"]).default("small"),
  verificationMethod: z.string().optional(),
  proofText: z.string().optional(),
  contactName: z.string().min(1, "请填写联系人姓名"),
  contactPhone: z.string().optional(),
  contactEmail: z.string().optional(),
  proofFiles: z
    .array(
      z.object({
        type: z.enum(["license_or_badge", "frontdesk", "work_badge", "other"]),
        url: z.string().min(1),
        title: z.string().optional(),
      }),
    )
    .optional(),
  personalCommitment: z.literal(true, { message: "请勾选个人承诺" }),
  disclaimerAccepted: z.literal(true, { message: "请同意网站免责申明" }),
});

export type EntityContactInfo = {
  phone?: string;
  email?: string;
  wechat?: string;
  address?: string;
};

export type EntityProfileContent = {
  sections: Array<{ type: string; title: string; content: string }>;
  tags: string[];
  keywords: string[];
  contact?: EntityContactInfo;
};

export type EntityReportContent = {
  sections?: Array<{ title: string; content: string }>;
  steps?: ReportStep[];
  segments?: ReportSegment[];
  segment_dimensions?: { cities?: string[]; industries?: string[] };
  recommendations: string[];
  training_points?: string[];
  brand_slogan_analysis?: string;
  one_line_positioning?: string;
};

export type EntityReportScores = Record<string, number>;

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  city: "åŸŽå¸‚",
  company: "ä¼ä¸š",
  person: "äººç‰©",
  brand: "å“ç‰Œ",
  profession: "èŒä¸š",
};

export const PERSON_SUBTYPE_LABELS: Record<string, string> = {
  entrepreneur: "ä¼ä¸šå®¶",
  executive: "ä¼ä¸šé«˜ç®¡",
  expert: "è®²å¸ˆä¸“å®¶",
  lawyer: "å¾‹å¸ˆ",
  doctor: "åŒ»ç”Ÿ",
  teacher: "æ•™å¸ˆ",
  student: "å­¦ç”Ÿ",
  youth_hero: "å°‘å¹´æ¦œæ ·",
  tech_talent: "ç§‘æŠ€äººæ‰",
  founder: "åˆ›ä¸šè€…",
  investor: "æŠ•èµ„äºº",
  influencer: "ä¸»æ’­è¾¾äºº",
  association_leader: "åä¼šè´Ÿè´£äºº",
  official: "å…¬èŒäººå‘˜",
};

