import { detectEntityType } from "@/lib/ai/detect-type";
import {
  buildSelfProvidedCandidate,
  lookupPersonCandidatesFromEncyclopedia,
} from "@/lib/search/lookup-person-encyclopedia";
import type { BatchAmbiguousPerson } from "@/lib/services/batch-disambiguation-shared";

export type { BatchAmbiguousPerson } from "@/lib/services/batch-disambiguation-shared";
export { batchPersonSelectionsComplete } from "@/lib/services/batch-disambiguation-shared";

/** @deprecated 同步扫描仅保留兼容；请使用 scanBatchPersonDisambiguationAsync */
export function scanBatchPersonDisambiguation(
  names: string[],
  entityType = "auto",
): { ambiguous: BatchAmbiguousPerson[]; ready: string[] } {
  const ambiguous: BatchAmbiguousPerson[] = [];
  const ready: string[] = [];
  for (const name of names) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    if (detectEntityType(trimmed, entityType).type !== "person") ready.push(trimmed);
  }
  return { ambiguous, ready };
}

/** 批量人物：逐一检索百科/维基，每位都需确认后再生成 */
export async function scanBatchPersonDisambiguationAsync(
  names: string[],
  entityType = "auto",
): Promise<{ ambiguous: BatchAmbiguousPerson[]; ready: string[] }> {
  const ambiguous: BatchAmbiguousPerson[] = [];
  const ready: string[] = [];

  for (const name of names) {
    const trimmed = name.trim();
    if (!trimmed) continue;

    const detected = detectEntityType(trimmed, entityType);
    if (detected.type !== "person") {
      ready.push(trimmed);
      continue;
    }

    const lookup = await lookupPersonCandidatesFromEncyclopedia(trimmed);
    ambiguous.push({
      name: trimmed,
      reason: lookup.reason,
      candidates:
        lookup.candidates.length > 0
          ? lookup.candidates
          : [buildSelfProvidedCandidate(trimmed)],
      allowCompare: lookup.allowCompare,
    });
  }

  return { ambiguous, ready };
}
