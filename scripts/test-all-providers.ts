import "dotenv/config";
import {
  getConfiguredApiProviders,
  getProviderStatuses,
  searchParallelProviders,
  fetchParallelEvidence,
} from "../src/lib/search/search-providers";
import { scrapeWithFirecrawl } from "../src/lib/search/firecrawl-search";

const QUERY = process.argv[2] || "陈行甲 公益 新闻";

async function main() {
  console.log("=== Search Provider Integration Test ===\n");
  console.log("Query:", QUERY);
  console.log("Status:", getProviderStatuses());
  console.log("Active:", getConfiguredApiProviders());
  console.log("");

  const providers = getConfiguredApiProviders();
  if (!providers.length) {
    console.error("No API providers configured. Set EXA_API_KEY, TAVILY_API_KEY, or FIRECRAWL_API_KEY.");
    process.exit(1);
  }

  console.log("--- Parallel search (deduped) ---");
  const searchHits = await searchParallelProviders(QUERY, {
    limitPerProvider: 3,
    totalLimit: 9,
    exaCategory: "news",
    tavilyTopic: "news",
  });
  console.log(`Results: ${searchHits.length}`);
  for (const r of searchHits) {
    console.log(`  [${r.provider}] ${r.title.slice(0, 50)}`);
    console.log(`    ${r.url}`);
  }
  console.log("");

  console.log("--- Parallel evidence (with body text) ---");
  const evidence = await fetchParallelEvidence(QUERY, {
    limitPerProvider: 2,
    exaCategory: "news",
    tavilyTopic: "news",
  });
  console.log(`Evidence chunks: ${evidence.length}`);
  for (const e of evidence) {
    console.log(`  [${e.provider}] ${e.title.slice(0, 50)} (${e.text.length} chars)`);
  }
  console.log("");

  if (process.env.FIRECRAWL_API_KEY && searchHits[0]?.url) {
    console.log("--- Firecrawl scrape (single URL) ---");
    const md = await scrapeWithFirecrawl(searchHits[0].url);
    console.log(`Scrape ${searchHits[0].url}: ${md ? `${md.length} chars` : "FAILED"}`);
  }

  console.log("\nOK — all configured providers tested.");
}

main().catch((e) => {
  console.error("FAIL:", e.message);
  process.exit(1);
});
