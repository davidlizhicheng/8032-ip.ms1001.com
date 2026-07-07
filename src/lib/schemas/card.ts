import { z } from "zod";

export const CARD_THEMES = [
  "business_gold_dark",
  "professional_light",
  "education_blue",
  "brand_orange",
  "brand_purple",
  "creator_bold",
  "poster_showcase",
] as const;

export type CardTheme = (typeof CARD_THEMES)[number];

export const SECTION_TYPES = [
  "business",
  "experience",
  "case",
  "honor",
  "service",
  "gallery",
  "video",
] as const;

export const MEDIA_TYPES = [
  "avatar",
  "logo",
  "cover",
  "poster",
  "case",
  "honor",
  "gallery",
] as const;

export const ParsedCardInfoSchema = z.object({
  name: z.string(),
  title: z.string(),
  company: z.string(),
  brand_slogan: z.string(),
  bio: z.string(),
  phone: z.string(),
  email: z.string(),
  wechat: z.string(),
  address: z.string(),
  services: z.array(z.string()),
  experiences: z.array(
    z.object({
      title: z.string(),
      content: z.string(),
    }),
  ),
  honors: z.array(
    z.object({
      title: z.string(),
      content: z.string(),
    }),
  ),
  cases: z.array(
    z.object({
      title: z.string(),
      content: z.string(),
    }),
  ),
  long_bio: z.string().default(""),
  profile_sections: z
    .array(
      z.object({
        type: z.string(),
        title: z.string(),
        content: z.string(),
      }),
    )
    .default([]),
  suggested_theme: z.enum(CARD_THEMES),
  missing_fields: z.array(z.string()),
});

export type ParsedCardInfo = z.infer<typeof ParsedCardInfoSchema>;

export const CreateCardSchema = z.object({
  name: z.string().min(1, "姓名不能为空"),
  title: z.string().optional(),
  company: z.string().optional(),
  brandSlogan: z.string().optional(),
  bio: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  wechat: z.string().optional(),
  address: z.string().optional(),
  logoUrl: z.string().optional(),
  exchangeEnabled: z.boolean().default(true).optional(),
  verificationMethod: z.string().optional(),
  verificationAccount: z.string().optional(),
  theme: z.enum(CARD_THEMES).default("brand_orange"),
  avatarUrl: z.string().optional(),
  coverUrl: z.string().optional(),
  services: z.array(z.string()).optional(),
  experiences: z
    .array(z.object({ title: z.string(), content: z.string() }))
    .optional(),
  honors: z
    .array(z.object({ title: z.string(), content: z.string() }))
    .optional(),
  cases: z
    .array(z.object({ title: z.string(), content: z.string() }))
    .optional(),
  longBio: z.string().optional(),
  profileSections: z
    .array(z.object({ type: z.string(), title: z.string(), content: z.string() }))
    .optional(),
  galleryImages: z
    .array(
      z.object({
        url: z.string(),
        type: z.enum(MEDIA_TYPES).default("gallery"),
        title: z.string().optional(),
      }),
    )
    .optional(),
  proofImages: z
    .array(
      z.object({
        url: z.string(),
        type: z.enum(MEDIA_TYPES).default("gallery"),
        title: z.string().optional(),
      }),
    )
    .optional(),
  videos: z
    .array(
      z.object({
        platform: z.string(),
        url: z.string(),
        title: z.string().optional(),
        coverUrl: z.string().optional(),
        embedUrl: z.string().optional(),
        description: z.string().optional(),
        canEmbed: z.boolean().default(false),
      }),
    )
    .optional(),
  slug: z.string().optional(),
});

export type CreateCardInput = z.infer<typeof CreateCardSchema>;

export const VideoPreviewSchema = z.object({
  platform: z.string(),
  url: z.string(),
  title: z.string(),
  cover_url: z.string(),
  embed_url: z.string(),
  can_embed: z.boolean(),
});

export type VideoPreview = z.infer<typeof VideoPreviewSchema>;

export const LeadSchema = z.object({
  cardId: z.string(),
  visitorName: z.string().optional(),
  visitorPhone: z.string().optional(),
  visitorWechat: z.string().optional(),
  message: z.string().optional(),
  source: z.enum(["save_card", "consult", "wechat", "phone"]).default("save_card"),
});
