import type { ResearchBundle } from "@/lib/search/research-types";
import { isKnownFamousName } from "@/lib/search/person-name-aliases";

/** 有权威百科且正文较长 → 视为名人，自动补图/视频 */
export function isFamousPerson(
  research: Pick<ResearchBundle, "baikeEntries" | "wiki" | "contextText">,
  name?: string,
) {
  const baikeChars = research.baikeEntries.reduce(
    (n, e) => n + (e.fullText?.length || 0),
    0,
  );
  const wikiChars = research.wiki?.fullText?.length || 0;
  if (baikeChars >= 1500 || wikiChars >= 1200) return true;
  if (research.baikeEntries.length >= 1 && baikeChars >= 800) return true;
  if (name && isKnownFamousName(name)) return true;
  return false;
}

export function famousPersonReason(research: Pick<ResearchBundle, "baikeEntries" | "wiki">) {
  if (research.baikeEntries.length) {
    return `百度百科（${research.baikeEntries[0].title}）`;
  }
  if (research.wiki) return "维基百科";
  return "";
}
