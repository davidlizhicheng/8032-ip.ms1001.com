import { prisma } from "@/lib/prisma";
import type { CreateCardInput } from "@/lib/schemas/card";
import { slugify, ensureUniqueSlug } from "@/lib/utils/slug";
import { normalizeStoredAssetUrl } from "@/lib/storage/public-url";

function normalizeCardRecord<
  T extends {
    avatarUrl?: string | null;
    coverUrl?: string | null;
    mediaAssets?: Array<{ url: string }>;
    videoLinks?: Array<{ coverUrl?: string | null }>;
  },
>(card: T): T {
  return {
    ...card,
    avatarUrl: normalizeStoredAssetUrl(card.avatarUrl) ?? card.avatarUrl,
    coverUrl: normalizeStoredAssetUrl(card.coverUrl) ?? card.coverUrl,
    mediaAssets: card.mediaAssets?.map((m) => ({
      ...m,
      url: normalizeStoredAssetUrl(m.url) ?? m.url,
    })),
    videoLinks: card.videoLinks?.map((v) => ({
      ...v,
      coverUrl: normalizeStoredAssetUrl(v.coverUrl) ?? v.coverUrl,
    })),
  };
}

export async function createCard(input: CreateCardInput, ownerUserId?: string) {
  const baseSlug = input.slug || slugify(input.name);
  const slug = await ensureUniqueSlug(baseSlug, async (s) => {
    const existing = await prisma.card.findUnique({ where: { slug: s } });
    return !!existing;
  });

  const sections: Array<{
    type: string;
    title: string;
    content: string;
    sortOrder: number;
  }> = [];

  let order = 0;

  if (input.bio && !input.longBio) {
    sections.push({
      type: "business",
      title: "个人简介",
      content: input.bio,
      sortOrder: order++,
    });
  }

  if (input.longBio) {
    sections.push({
      type: "story",
      title: "详细介绍",
      content: input.longBio,
      sortOrder: order++,
    });
  }

  input.profileSections?.forEach((sec) => {
    sections.push({
      type: sec.type || "story",
      title: sec.title,
      content: sec.content,
      sortOrder: order++,
    });
  });

  if (input.services?.length) {
    sections.push({
      type: "service",
      title: "服务项目",
      content: input.services.join("、"),
      sortOrder: order++,
    });
  }

  input.experiences?.forEach((exp) => {
    sections.push({
      type: "experience",
      title: exp.title || "过往经历",
      content: exp.content,
      sortOrder: order++,
    });
  });

  input.honors?.forEach((honor) => {
    sections.push({
      type: "honor",
      title: honor.title || "荣誉资质",
      content: honor.content,
      sortOrder: order++,
    });
  });

  input.cases?.forEach((item) => {
    sections.push({
      type: "case",
      title: item.title || "客户案例",
      content: item.content,
      sortOrder: order++,
    });
  });

  sections.push({
    type: "exchange",
    title: "名片交换说明",
    content: JSON.stringify({
      enabled: input.exchangeEnabled !== false,
      ownerResponsible: true,
      note: "本名片由本人或名片创建者自行提交并对真实性负责；交换名片用于商务联系与留资咨询。",
    }),
    sortOrder: order++,
  });

  const verificationMethod = input.verificationMethod || (input.companySize === "large" ? "company_email" : "frontdesk_photos");
  sections.push({
    type: "verification",
    title: "认证材料",
    content: JSON.stringify({
      status: "pending_review",
      method: verificationMethod,
      account: input.verificationAccount || input.email || "",
      companySize: input.companySize || "small",
      proofCount: input.proofImages?.length || 0,
      personalCommitment: Boolean(input.personalCommitment),
      disclaimerAccepted: Boolean(input.disclaimerAccepted),
      note: "认证路径：1、执照或工牌；2、前台/门头照片；3、公司邮箱认证（大公司回复即可）；4、个人承诺；5、网站免责申明。首次由管理员确认，确认后本人可维护名片内容。",
    }),
    sortOrder: order++,
  });

  const card = await prisma.card.create({
    data: {
      slug,
      userId: ownerUserId,
      name: input.name,
      title: input.title,
      company: input.company,
      avatarUrl: normalizeStoredAssetUrl(input.avatarUrl),
      coverUrl: normalizeStoredAssetUrl(input.coverUrl),
      brandSlogan: input.brandSlogan,
      bio: input.bio,
      phone: input.phone,
      email: input.email,
      wechat: input.wechat,
      address: input.address,
      theme: input.theme,
      visibility: "private",
      isFeatured: false,
      sections: { create: sections },
      mediaAssets: {
        create: [
          ...(input.avatarUrl
            ? [{ url: normalizeStoredAssetUrl(input.avatarUrl)!, type: "avatar", sortOrder: 0 }]
            : []),
          ...(input.coverUrl
            ? [{ url: normalizeStoredAssetUrl(input.coverUrl)!, type: "cover", sortOrder: 1 }]
            : []),
          ...(input.logoUrl
            ? [{ url: normalizeStoredAssetUrl(input.logoUrl)!, type: "logo", title: "Logo", sortOrder: 2 }]
            : []),
          ...(input.galleryImages?.map((img, i) => ({
            url: normalizeStoredAssetUrl(img.url) ?? img.url,
            type: img.type,
            title: img.title,
            sortOrder: i + 3,
          })) || []),
          ...(input.proofImages?.map((img, i) => ({
            url: normalizeStoredAssetUrl(img.url) ?? img.url,
            type: "gallery",
            title: img.title || `认证材料 ${i + 1}`,
            sortOrder: i + 100,
          })) || []),
        ],
      },
      videoLinks: {
        create:
          input.videos?.map((video, i) => ({
            platform: video.platform,
            url: video.url,
            title: video.title,
            coverUrl: normalizeStoredAssetUrl(video.coverUrl),
            embedUrl: video.embedUrl,
            description: video.description,
            canEmbed: video.canEmbed,
            sortOrder: i,
          })) || [],
      },
    },
    include: {
      sections: true,
      mediaAssets: true,
      videoLinks: true,
    },
  });

  return card;
}

export async function getCardBySlug(slug: string, options?: { includePrivate?: boolean }) {
  const card = await prisma.card.findUnique({
    where: { slug },
    include: {
      sections: { orderBy: { sortOrder: "asc" } },
      mediaAssets: { orderBy: { sortOrder: "asc" } },
      videoLinks: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!card) return null;
  if (card.visibility === "admin_hidden") return null;
  if (!options?.includePrivate && card.visibility !== "public") return null;
  return normalizeCardRecord(card);
}

export async function getCardForViewer(
  slug: string,
  viewerUserId?: string | null,
  isAdmin?: boolean,
) {
  const card = await prisma.card.findUnique({
    where: { slug },
    include: {
      sections: { orderBy: { sortOrder: "asc" } },
      mediaAssets: { orderBy: { sortOrder: "asc" } },
      videoLinks: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!card || card.visibility === "admin_hidden") return null;
  const { canViewContent } = await import("@/lib/visibility");
  if (!canViewContent({
    visibility: card.visibility,
    ownerUserId: card.userId,
    viewerUserId,
    isAdmin,
  })) {
    return null;
  }
  return normalizeCardRecord(card);
}

export async function getCardById(id: string) {
  const card = await prisma.card.findUnique({
    where: { id },
    include: {
      sections: { orderBy: { sortOrder: "asc" } },
      mediaAssets: { orderBy: { sortOrder: "asc" } },
      videoLinks: { orderBy: { sortOrder: "asc" } },
    },
  });
  return card ? normalizeCardRecord(card) : null;
}
