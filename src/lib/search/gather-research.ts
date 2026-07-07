import { gatherDeepResearch } from "@/lib/search/gather-deep-research";
import type { EnrichedSource } from "@/lib/search/baike-fetcher";
import type {
  ResearchBundle,
  ResearchProgressCallback,
} from "@/lib/search/research-types";

export type { ResearchBundle, ResearchStep, ResearchProgressCallback } from "@/lib/search/research-types";

/** @deprecated 兼容旧字段：单条百科 */
export type LegacyResearchBundle = ResearchBundle & {
  baike: EnrichedSource | null;
};

export async function gatherEntityResearch(
  name: string,
  type: string,
  options: {
    fetchNews?: boolean;
    webSearch?: boolean;
    onProgress?: ResearchProgressCallback;
  } = {},
): Promise<LegacyResearchBundle> {
  if (options.webSearch === false) {
    const empty: LegacyResearchBundle = {
      news: [],
      webResults: [],
      baikeEntries: [],
      wiki: null,
      webCrawlPages: [],
      pageExcerpts: [],
      contextText: "",
      sourceCount: 0,
      steps: [],
      baike: null,
    };
    return empty;
  }

  const bundle = await gatherDeepResearch(name, type, {
    fetchNews: options.fetchNews,
    onProgress: options.onProgress,
  });

  return {
    ...bundle,
    baike: bundle.baikeEntries[0] || null,
  };
}
