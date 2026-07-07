import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  discoverImagesForEntityPage,
  isBrandImageEntityType,
} from "@/lib/search/discover-brand-images-server";
import { discoverBrandImages } from "@/lib/search/discover-brand-images";

type Params = { params: Promise<{ slug: string }> };

/** 按实体 slug 搜索品牌相关图片 */
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { slug } = await params;
    const entity = await prisma.entity.findUnique({
      where: { slug },
      select: {
        name: true,
        type: true,
        mediaAssets: { select: { type: true } },
      },
    });

    if (!entity) {
      return NextResponse.json({ error: "实体不存在" }, { status: 404 });
    }

    if (!isBrandImageEntityType(entity.type)) {
      return NextResponse.json({ images: [], count: 0 });
    }

    const galleryCount = entity.mediaAssets.filter((m) => m.type !== "cover").length;
    const images = await discoverImagesForEntityPage(
      entity.name,
      entity.type,
      galleryCount,
    );

    return NextResponse.json({
      brandName: entity.name,
      entityType: entity.type,
      count: images.length,
      images,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "搜图失败" },
      { status: 500 },
    );
  }
}

/** 按品牌名直接搜图（无需 slug） */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { slug } = await params;
    const entity = await prisma.entity.findUnique({
      where: { slug },
      select: { name: true, type: true },
    });
    if (!entity) {
      return NextResponse.json({ error: "实体不存在" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const query = typeof body.query === "string" && body.query.trim()
      ? body.query.trim()
      : entity.name;

    const entityType = isBrandImageEntityType(entity.type) ? entity.type : undefined;
    const images = await discoverBrandImages({
      brandName: query,
      entityType,
      limit: body.limit ?? 12,
    });

    return NextResponse.json({
      brandName: query,
      entityType: entity.type,
      count: images.length,
      images,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "搜图失败" },
      { status: 500 },
    );
  }
}
