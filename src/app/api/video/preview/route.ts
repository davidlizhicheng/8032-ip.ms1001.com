import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseVideoUrl } from "@/lib/video/parser";

const RequestSchema = z.object({
  url: z.string().url("请输入有效的视频链接"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = RequestSchema.parse(body);
    const preview = parseVideoUrl(url);
    return NextResponse.json(preview);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "参数错误" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "视频解析失败" }, { status: 500 });
  }
}
