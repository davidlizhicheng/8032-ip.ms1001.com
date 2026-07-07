import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { scanBatchPersonDisambiguationAsync } from "@/lib/services/batch-disambiguation";

const Schema = z.object({
  names: z.union([z.string(), z.array(z.string())]),
  entityType: z.string().default("auto"),
});

export async function POST(request: NextRequest) {
  try {
    const body = Schema.parse(await request.json());
    const nameList = (
      Array.isArray(body.names)
        ? body.names
        : body.names.split("\n").map((l) => l.trim())
    ).filter(Boolean);

    const result = await scanBatchPersonDisambiguationAsync(nameList, body.entityType);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "检查失败" },
      { status: 500 },
    );
  }
}
