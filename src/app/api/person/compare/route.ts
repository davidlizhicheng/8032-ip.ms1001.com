import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generatePersonComparison } from "@/lib/ai/generate-person-comparison";
import { resolveRegistryCandidate } from "@/lib/search/person-disambiguation-registry";

const Schema = z.object({
  name: z.string().min(1),
  candidateIds: z.array(z.string()).min(2).max(3),
});

export async function POST(request: NextRequest) {
  try {
    const body = Schema.parse(await request.json());
    const name = body.name.trim();
    const candidates = body.candidateIds
      .map((id) => resolveRegistryCandidate(name, id))
      .filter((c): c is NonNullable<typeof c> => Boolean(c));
    if (candidates.length < 2) {
      return NextResponse.json(
        { error: "未找到足够的注册候选人物，暂不支持对比" },
        { status: 400 },
      );
    }
    const comparison = await generatePersonComparison(name, candidates);
    return NextResponse.json({ name, comparison });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "对比生成失败" },
      { status: 500 },
    );
  }
}
