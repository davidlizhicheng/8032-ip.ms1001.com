import "dotenv/config";
import { gatherEntityResearch } from "../src/lib/search/gather-research";
import { generateEntityContent } from "../src/lib/ai/generate-entity";
import { detectEntityType } from "../src/lib/ai/detect-type";

async function main() {
  const name = process.argv[2] || "华为";
  const detected = detectEntityType(name, process.argv[3]);
  console.log("生成对象:", name, detected.type);

  const research = await gatherEntityResearch(name, detected.type);
  console.log("检索来源:", research.sourceCount);

  const entity = await generateEntityContent(
    name,
    detected.type,
    detected.subtype,
    research.news,
    research.contextText,
    research.webResults,
  );

  console.log("\n=== 生成结果 ===");
  console.log("title:", entity.title);
  console.log("summary:", entity.summary);
  console.log("sections:", entity.sections.length);
  console.log("sources:", entity.sources?.length || 0);
  console.log("首段:", entity.sections[0]?.title, "-", entity.sections[0]?.content.slice(0, 120));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
