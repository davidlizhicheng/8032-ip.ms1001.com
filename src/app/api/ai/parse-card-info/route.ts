import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseCardWithOptions } from "@/lib/ai/parse-card";

const RequestSchema = z
  .object({
    rawText: z.string(),
    enrichFromWeb: z
      .union([z.boolean(), z.literal("true"), z.literal("false")])
      .optional()
      .default(false)
      .transform((v) => v === true || v === "true"),
    confirmedCandidateId: z.string().optional(),
    confirmedIdentityHint: z.string().optional(),
    compareMode: z.boolean().optional(),
    compareCandidateIds: z.array(z.string()).optional(),
  })
  .superRefine((data, ctx) => {
    const min = data.enrichFromWeb ? 2 : 10;
    if (data.rawText.trim().length < min) {
      ctx.addIssue({
        code: "custom",
        path: ["rawText"],
        message: data.enrichFromWeb
          ? "至少输入 2 个字（如姓名）；资料越详细，生成效果越好"
          : "请至少输入 10 个字符的个人资料",
      });
    }
  });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = RequestSchema.parse(body);
    const result = await parseCardWithOptions({
      rawText: input.rawText,
      enrichFromWeb: input.enrichFromWeb,
      confirmedCandidateId: input.confirmedCandidateId,
      confirmedIdentityHint: input.confirmedIdentityHint,
      compareMode: input.compareMode,
      compareCandidateIds: input.compareCandidateIds,
    });

    if (result.status === "needs_confirmation" || result.status === "comparison") {
      return NextResponse.json(result);
    }

    return NextResponse.json({
      status: "success",
      ...result.data,
      sourcesUsed: result.sourcesUsed,
      researchSteps: result.researchSteps,
      famousMedia: result.famousMedia ?? null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "参数错误" },
        { status: 400 },
      );
    }
    console.error("AI parse error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI 解析失败" },
      { status: 500 },
    );
  }
}
