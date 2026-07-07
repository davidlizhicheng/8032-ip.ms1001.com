import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fetchNewsForEntity } from "@/lib/news/fetcher";
import { detectEntityType } from "@/lib/ai/detect-type";

const Schema = z.object({
  name: z.string().min(1),
  type: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type } = Schema.parse(body);
    const detected = detectEntityType(name, type);
    const news = await fetchNewsForEntity(name, detected.type);
    return NextResponse.json({ name, type: detected.type, news });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: "抓取失败" }, { status: 500 });
  }
}
