import type { PersonCandidate } from "@/lib/search/disambiguate-person";

export type BatchAmbiguousPerson = {
  name: string;
  reason: string;
  candidates: PersonCandidate[];
  allowCompare: boolean;
};

export function batchPersonSelectionsComplete(
  ambiguous: BatchAmbiguousPerson[],
  selections: Record<string, string>,
): boolean {
  return ambiguous.every((item) => Boolean(selections[item.name]?.trim()));
}
