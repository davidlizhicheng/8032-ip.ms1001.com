import { generatePersonBioFromBaike } from "@/lib/ai/generate-person-bio";
import { rewriteLongBioFromResearch, contentNeedsRewrite } from "@/lib/ai/content-integrator";
import { normalizeParsedCardFromBio } from "@/lib/ai/parse-card-normalize";
import { formatFactBundleForIntegration } from "@/lib/pipeline/fact-relevance-filter";
import type { PersonFactBundle, PipelineStepLog } from "@/lib/pipeline/types";
import { ParsedCardInfoSchema, type ParsedCardInfo } from "@/lib/schemas/card";

const MIN_LONG_BIO = 900;

/** 第四步：仅基于第三步事实包整合写作（禁止在此阶段重新联网检索） */
export async function integratePersonCardContent(
  rawText: string,
  factBundle: PersonFactBundle,
  options?: {
    onStep?: (step: PipelineStepLog) => void;
  },
): Promise<ParsedCardInfo> {
  options?.onStep?.({
    phase: "integrate",
    label: "整合百科事实，撰写个人介绍…",
    status: "running",
  });

  const context = formatFactBundleForIntegration(factBundle);
  let parsed = await generatePersonBioFromBaike(
    factBundle.name,
    context,
    rawText,
    factBundle.identityHint,
  );

  let normalized = normalizeParsedCardFromBio(parsed, rawText, context);
  if (normalized.long_bio.trim().length < MIN_LONG_BIO || contentNeedsRewrite(normalized.long_bio, 800)) {
    try {
      const rewritten = await rewriteLongBioFromResearch(
        factBundle.name,
        context,
        factBundle.identityHint,
      );
      normalized = ParsedCardInfoSchema.parse({ ...normalized, long_bio: rewritten });
    } catch {
      parsed = await generatePersonBioFromBaike(
        factBundle.name,
        context,
        rawText,
        `${factBundle.identityHint}（请务必写满 long_bio 1000 字以上，只写已确认身份，禁止照抄百科原文）`.trim(),
      );
      normalized = normalizeParsedCardFromBio(parsed, rawText, context);
    }
  }

  options?.onStep?.({
    phase: "integrate",
    label: `整合完成，正文 ${normalized.long_bio.trim().length} 字`,
    status: "done",
  });

  return normalized;
}
