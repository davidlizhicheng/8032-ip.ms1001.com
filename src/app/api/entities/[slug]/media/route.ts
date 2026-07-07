import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { uploadImage } from "@/lib/storage/upload";
import { parseVideoUrl } from "@/lib/video/parser";
import { normalizeStoredAssetUrl } from "@/lib/storage/public-url";
import { isValidStoredAssetUrl } from "@/lib/storage/asset-url";
import {
  AuthError,
  authErrorResponse,
  hasBrandUpgrade,
  optionalAuth,
} from "@/lib/auth/require-auth";

type Params = { params: Promise<{ slug: string }> };

async function ensureMultiUploadAllowed(entityId: string, request: NextRequest) {
  if (process.env.DEV_MOCK_PAYMENT === "true") return;

  const galleryCount = await prisma.mediaAsset.count({
    where: { entityId, type: { in: ["gallery", "cover", "avatar"] } },
  });
  if (galleryCount < 1) return;

  const ctx = await optionalAuth(request);
  if (!ctx) {
    throw new AuthError("多图上传需先登录并开通品牌升级", 401, "LOGIN_REQUIRED");
  }
  if (!hasBrandUpgrade(ctx.user, ctx.suatUser)) {
    throw new AuthError("多图上传需开通品牌升级（500元）", 402, "UPGRADE_REQUIRED");
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { slug } = await params;
    const entity = await prisma.entity.findUnique({ where: { slug } });
    if (!entity) {
      return NextResponse.json({ error: "实体不存在" }, { status: 404 });
    }

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      await ensureMultiUploadAllowed(entity.id, request);
      const formData = await request.formData();
      const file = formData.get("file");
      const mediaType = String(formData.get("type") || "gallery");
      const title = String(formData.get("title") || "");

      if (!file || !(file instanceof File)) {
        return NextResponse.json({ error: "请上传图片文件" }, { status: 400 });
      }

      const url = await uploadImage(file);
      const asset = await prisma.mediaAsset.create({
        data: {
          entityId: entity.id,
          url,
          type: mediaType,
          title: title || undefined,
          sortOrder: Date.now(),
        },
      });

      if (mediaType === "cover") {
        await prisma.entityProfile.update({
          where: { entityId: entity.id },
          data: { coverUrl: url },
        });
      }

      await prisma.auditLog.create({
        data: {
          entityId: entity.id,
          action: "user_upload_image",
          details: `上传图片：${mediaType}`,
        },
      });

      return NextResponse.json({ success: true, asset });
    }

    const body = await request.json();

    if ("imageUrl" in body && typeof body.imageUrl === "string") {
      await ensureMultiUploadAllowed(entity.id, request);
      const input = z.object({
        imageUrl: z.string().refine(isValidStoredAssetUrl, "无效图片地址"),
        type: z.enum(["gallery", "cover", "avatar"]).default("gallery"),
        title: z.string().optional(),
      }).parse(body);

      const storedUrl = normalizeStoredAssetUrl(input.imageUrl) || input.imageUrl;

      const asset = await prisma.mediaAsset.create({
        data: {
          entityId: entity.id,
          url: storedUrl,
          type: input.type,
          title: input.title,
          sortOrder: Date.now(),
        },
      });

      if (input.type === "cover") {
        await prisma.entityProfile.update({
          where: { entityId: entity.id },
          data: { coverUrl: storedUrl },
        });
      }

      return NextResponse.json({ success: true, asset });
    }

    const input = z.object({
      videoUrl: z.string().url(),
      title: z.string().optional(),
    }).parse(body);

    const parsed = parseVideoUrl(input.videoUrl);
    if (parsed.platform === "unknown") {
      return NextResponse.json({ error: "请使用 B站、YouTube、腾讯视频等可识别链接" }, { status: 400 });
    }

    const video = await prisma.videoLink.create({
      data: {
        entityId: entity.id,
        platform: parsed.platform,
        url: parsed.url,
        title: input.title || parsed.title,
        coverUrl: parsed.cover_url,
        embedUrl: parsed.embed_url,
        canEmbed: parsed.can_embed,
        sortOrder: Date.now(),
      },
    });

    await prisma.auditLog.create({
      data: {
        entityId: entity.id,
        action: "user_upload_video",
        details: `添加视频：${parsed.platform}`,
      },
    });

    return NextResponse.json({ success: true, video });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    if (error instanceof AuthError) {
      return authErrorResponse(error);
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "上传失败" },
      { status: 500 },
    );
  }
}

export async function GET(_request: NextRequest, { params }: Params) {
  const { slug } = await params;
  const entity = await prisma.entity.findUnique({
    where: { slug },
    include: {
      mediaAssets: { orderBy: { sortOrder: "asc" } },
      videoLinks: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!entity) return NextResponse.json({ error: "未找到" }, { status: 404 });
  return NextResponse.json({
    images: entity.mediaAssets,
    videos: entity.videoLinks,
  });
}
