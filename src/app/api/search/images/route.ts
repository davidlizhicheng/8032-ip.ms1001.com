import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { discoverBrandImages } from "@/lib/search/discover-brand-images";
import type { ImageSearchOptions } from "@/lib/search/image-search";

const Schema = z.object({
  query: z.string().min(1, "请输入搜索关键词"),
  brandName: z.string().optional(),
  entityType: z.enum(["company", "brand", "person", "city"]).optional(),
  limit: z.number().int().min(1).max(24).optional(),
  includeBaike: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = Schema.parse(body);

    const hits = await discoverBrandImages({
      brandName: input.brandName || input.query,
      entityType: input.entityType as ImageSearchOptions["entityType"],
      limit: input.limit,
    });

    return NextResponse.json({
      query: input.query,
      count: hits.length,
      images: hits,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "图片搜索失败" },
      { status: 500 },
    );
  }
}
