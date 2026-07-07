import type { EntityLockResult, EvidencePack, PipelineContext, WritingResult } from "@/lib/agents/types";
import { createStreamEmitter } from "@/lib/agents/stream-events";
import { EVIDENCE_MIN_SOURCES } from "@/lib/agents/evidence-agent";
import {
  generateEntityContent,
  generateReportContent,
} from "@/lib/ai/generate-entity";
import type { EntityType } from "@/lib/schemas/entity";
import type { NewsItem } from "@/lib/news/fetcher";

/** 文章生成 Agent：仅基于 Evidence Pack，分节生成 + 质量门槛 */
export async function runWritingAgent(
  lock: EntityLockResult,
  evidence: EvidencePack,
  options: {
    fetchNews?: boolean;
    generateReport?: boolean;
  },
  ctx: PipelineContext = {},
): Promise<WritingResult> {
  const stream = createStreamEmitter(ctx);

  if (!evidence.readyForWriting) {
    stream.status(
      `警告：高质量证据仅 ${evidence.highQualityCount} 条（要求 ≥${EVIDENCE_MIN_SOURCES}），仍将尝试生成但可能质量不足`,
      "writing",
    );
  } else {
    stream.status(`证据充足（${evidence.highQualityCount} 条），开始生成正文…`, "writing");
  }

  stream.section("档案元信息", "generating");
  const entity = await generateEntityContent(
    lock.name,
    lock.type,
    lock.subtype,
    [] as NewsItem[],
    evidence.contextText,
    [],
    {
      baikeOnly: false,
      identityHint: lock.identityHint,
    },
  );
  stream.section("档案正文", "done");

  let report;
  if (options.generateReport !== false) {
    stream.section("品牌18步报告", "generating");
    report = await generateReportContent(
      lock.name,
      lock.type as EntityType,
      entity.summary,
      [],
      evidence.contextText,
      {
        identityHint: lock.identityHint,
        onProgress: (message) => stream.status(message, "writing"),
      },
    );
    stream.section("品牌18步报告", "done");
  }

  stream.status(`写作完成：摘要 ${entity.summary?.length || 0} 字，${entity.sections?.length || 0} 节`, "writing");

  return { entity, report };
}
