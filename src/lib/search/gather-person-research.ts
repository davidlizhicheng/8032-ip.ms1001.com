import { gatherDeepResearch } from "@/lib/search/gather-deep-research";
import { fetchBaikeFromUrl, fetchWikiFromUrl } from "@/lib/search/baike-fetcher";
import type { RegistryPersonCandidate } from "@/lib/search/person-disambiguation-registry";

export type PersonResearchOptions = {
  candidate?: RegistryPersonCandidate | null;
  identityHint?: string;
  /** 用户从百科候选中确认的百度百科 URL */
  confirmedBaikeUrl?: string;
  /** 用户从百科候选中确认的维基百科 URL */
  confirmedWikiUrl?: string;
};

export async function gatherPersonResearchForCard(
  name: string,
  options: PersonResearchOptions = {},
) {
  const candidate = options.candidate;
  const bundle = await gatherDeepResearch(name, "person", {
    fetchNews: false,
    extraQueries: candidate?.searchQueries || [],
    excludeKeywords: candidate?.excludeKeywords || [],
    skipGovPages: true,
  });

  if (options.confirmedBaikeUrl) {
    const pinned = await fetchBaikeFromUrl(options.confirmedBaikeUrl, name);
    if (pinned) {
      bundle.baikeEntries = [
        pinned,
        ...bundle.baikeEntries.filter((e) => e.url.split("?")[0] !== pinned.url.split("?")[0]),
      ];
    }
  }

  if (options.confirmedWikiUrl) {
    const wikiPinned = await fetchWikiFromUrl(options.confirmedWikiUrl, name);
    if (wikiPinned) {
      bundle.wiki = wikiPinned;
    }
  }

  return {
    contextText: bundle.contextText,
    webResults: bundle.webResults,
    webCrawlPages: bundle.webCrawlPages,
    sourceCount: bundle.sourceCount,
    steps: bundle.steps,
    baikeEntries: bundle.baikeEntries,
    wiki: bundle.wiki,
    identityHint: candidate?.identityHint || options.identityHint || "",
  };
}
