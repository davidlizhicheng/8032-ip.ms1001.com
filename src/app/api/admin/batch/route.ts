import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { BatchJobSchema } from "@/lib/schemas/entity";
import { createBatchJob, processBatchJob } from "@/lib/services/generation-job";
import { BATCH_PRODUCTION_ENABLED, BATCH_PRODUCTION_CLOSED_HINT } from "@/lib/config/batch-production";

export async function POST(request: NextRequest) {
  if (!BATCH_PRODUCTION_ENABLED) {
    return NextResponse.json({ error: BATCH_PRODUCTION_CLOSED_HINT }, { status: 503 });
  }
  try {
    const body = await request.json();
    const input = BatchJobSchema.parse(body);
    const job = await createBatchJob(input);

    // 异步处理，前端轮询任务进度
    void processBatchJob(job.id).catch((error) => {
      console.error("Batch job failed:", error);
    });

    return NextResponse.json({
      id: job.id,
      status: "running",
      totalCount: job.totalCount,
      items: job.items,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    console.error("Batch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "批量生成失败" },
      { status: 500 },
    );
  }
}
