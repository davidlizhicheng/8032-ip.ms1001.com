/**
 * 五步人物流水线端到端自检（1 收输入 → 2 人名 → 3 查找 → 4 整合）
 * 用法: npx tsx scripts/test-person-pipeline.ts [姓名]
 */
import "dotenv/config";
import {
  receiveUserInput,
  resolvePersonName,
  runPersonLookupPipeline,
  fetchPersonFacts,
} from "../src/lib/pipeline/person-content-pipeline";
import { integratePersonCardContent } from "../src/lib/pipeline/integrate-person-content";
import { filterRelevantFacts } from "../src/lib/pipeline/fact-relevance-filter";
import { lookupPersonCandidatesFromEncyclopedia } from "../src/lib/search/lookup-person-encyclopedia";
import { resolveEncyclopediaCandidate } from "../src/lib/search/lookup-person-encyclopedia";
import { isAIConfigured } from "../src/lib/ai/providers";

const TEST_NAME = process.argv[2] || "马云";
const RAW = process.argv[3] || TEST_NAME;

async function main() {
  console.log("=== 人物五步流水线 E2E ===");
  console.log("AI configured:", isAIConfigured());
  console.log("测试姓名:", TEST_NAME, "| 输入:", RAW.slice(0, 40));

  // Step 1
  const input = receiveUserInput(RAW, true);
  console.log("\n[1/5] ✓ 收取输入", input.charCount, "字");

  // Step 2
  const nameRes = resolvePersonName(input.rawText);
  console.log("[2/5] ✓ 确定人名:", nameRes.name, `(${nameRes.confidence})`);

  const lookup = await lookupPersonCandidatesFromEncyclopedia(nameRes.name);
  if (!lookup.candidates.length) {
    throw new Error("百科无候选，无法继续");
  }
  console.log("[2/5] ✓ 百科候选", lookup.candidates.length, "个");
  lookup.candidates.slice(0, 3).forEach((c, i) => {
    console.log(`       ${i + 1}. ${c.label} (${c.id.slice(0, 40)}…)`);
  });

  const candidateId =
    lookup.candidates.find((c) => c.id.startsWith("baike:"))?.id ||
    lookup.candidates[0]?.id;
  if (!candidateId) {
    throw new Error("百科无候选，无法继续");
  }
  console.log("       选用候选 ID:", candidateId);
  const resolved = await resolveEncyclopediaCandidate(nameRes.name, candidateId);

  // Step 3 — pipeline fetch only
  const pipeline = await runPersonLookupPipeline({
    rawText: RAW,
    enrichFromWeb: true,
    confirmedCandidateId: candidateId,
    onStep: (s) => {
      if (s.phase === "fetch") console.log(`       [fetch] ${s.label}`);
    },
  });

  if (pipeline.status !== "ready") {
    throw new Error(`pipeline 应 ready，实际 ${pipeline.status}`);
  }

  const { factBundle } = pipeline;
  console.log("[3/5] ✓ 查找完成");
  console.log("       百科条目:", factBundle.baikeEntries.length);
  console.log("       维基:", factBundle.wiki ? "有" : "无");
  console.log("       高相关事实:", factBundle.facts.length, "条");
  if (factBundle.facts.length) {
    console.log(
      "       样例:",
      factBundle.facts[0].category,
      factBundle.facts[0].excerpt.slice(0, 60) + "…",
    );
  }

  const baikeChars =
    factBundle.baikeEntries[0]?.fullText?.length ||
    factBundle.baikeEntries[0]?.snippet?.length ||
    0;
  if (baikeChars < 100 && factBundle.facts.length < 2) {
    console.warn("[3/5] ⚠ 百科正文偏少，整合质量可能下降");
  }

  // Step 4 — integrate only (no re-fetch)
  if (!isAIConfigured()) {
    console.log("\n[4/5] ⊘ 跳过整合（未配置 AI）");
    console.log("\n=== 流水线 1-3 步通过 ===");
    return;
  }

  console.log("\n[4/5] 整合写作中（仅读事实包，不重新检索）…");
  const t0 = Date.now();
  const card = await integratePersonCardContent(RAW, factBundle, {
    onStep: (s) => console.log(`       [integrate] ${s.label}`),
  });
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  const longLen = card.long_bio.trim().length;
  const nameHits = (card.long_bio.match(new RegExp(TEST_NAME, "g")) || []).length;
  console.log("[4/5] ✓ 整合完成", elapsed + "s");
  console.log("       long_bio:", longLen, "字");
  console.log("       bio:", card.bio.trim().slice(0, 80) + "…");
  console.log("       模块数:", card.profile_sections?.length || 0);

  const onTopic = /品牌学会|管理咨询|公司权力|深圳特区报/.test(card.long_bio + card.bio);
  const onTopicMa =
    TEST_NAME === "马云"
      ? /阿里巴巴|马云|杭州|企业家/.test(card.long_bio + card.bio)
      : onTopic;
  if (!onTopicMa && TEST_NAME !== "马云") {
    throw new Error("正文主题错误（未命中已确认人物关键词）");
  }
  if (TEST_NAME === "马云" && !/阿里巴巴|马云/.test(card.long_bio + card.bio)) {
    throw new Error("正文主题错误（马云条目未命中）");
  }
  console.log("[4/5] ✓ 主题正确");

  if (longLen < 500) {
    console.warn(
      `[4/5] ⚠ long_bio 仅 ${longLen} 字（本地百科常抓不到全文；国内服务器部署后通常 ≥1000）`,
    );
  }

  const junk = /身家|股价|涨停|万亿富豪|姓氏.{0,4}李|李大钊/.test(card.long_bio);
  if (junk) console.warn("[4/5] ⚠ 含碎新闻痕迹");
  else console.log("[4/5] ✓ 无财经快讯污染");

  console.log("\n=== 五步流水线 1-4 通过 ===");
  console.log("预览:\n", card.long_bio.trim().slice(0, 400) + "…");
}

main().catch((e) => {
  console.error("\n✗ 失败:", e instanceof Error ? e.message : e);
  process.exit(1);
});
