import "dotenv/config";
import { gatherEntityResearch } from "../src/lib/search/gather-research";
import { isWebSearchConfigured } from "../src/lib/search/web-search";
import { isAIConfigured } from "../src/lib/ai/providers";

async function main() {
  const name = process.argv[2] || "华为";
  const type = process.argv[3] || "company";

  console.log("=== 检索能力自检 ===");
  console.log("AI configured:", isAIConfigured());
  console.log("Web search API:", isWebSearchConfigured() ? "Serper/Tavily" : "Bing CN fallback");

  console.log(`\n=== 检索: ${name} (${type}) ===`);
  const research = await gatherEntityResearch(name, type);
  console.log("新闻条数:", research.news.length);
  console.log("网页条数:", research.webResults.length);
  console.log("百科:", research.baike ? "已抓取" : "未找到");
  if (research.baike?.fullText) {
    console.log("百科正文长度:", research.baike.fullText.length);
    console.log("百科摘要:", research.baike.fullText.slice(0, 150));
  }

  if (research.webResults.length) {
    console.log("\n网页样例:");
    research.webResults.slice(0, 3).forEach((item, i) => {
      console.log(`${i + 1}. ${item.title}`);
      console.log(`   ${item.url}`);
      console.log(`   ${item.snippet.slice(0, 100)}...`);
    });
  }

  if (research.news.length) {
    console.log("\n新闻样例:");
    research.news.slice(0, 2).forEach((item, i) => {
      console.log(`${i + 1}. ${item.title}`);
    });
  }

  console.log("\ncontext 预览:\n", research.contextText.slice(0, 800));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
