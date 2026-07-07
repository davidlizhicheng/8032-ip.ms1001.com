import "dotenv/config";
import { generateReportContent } from "../src/lib/ai/generate-entity";

const SAMPLE_CONTEXT = `
【百科摘要】雷军，1969年生于湖北仙桃，金山软件联合创始人，2010年创立小米科技。
小米口号：为发烧而生、感动人心价格厚道。2010年4月6日十来个人喝小米粥创业。
2011年发布首款小米手机，2020年小米10冲击高端，2021年造车宣布。
雷军个人标签：劳模、Are you OK、年度演讲、Walking雷军。
`;

function excerpt(text: string, n = 80) {
  return (text || "").replace(/\s+/g, " ").slice(0, n);
}

async function main() {
  const name = process.argv[2] || "雷军";
  console.log(`\n=== 测试人物报告生成：${name} ===\n`);

  const t0 = Date.now();
  const report = await generateReportContent(
    name,
    "person",
    `${name}，小米创始人`,
    [],
    SAMPLE_CONTEXT,
    { identityHint: "小米科技创始人、董事长兼CEO" },
  );
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  const steps = report.steps || [];
  console.log(`耗时: ${elapsed}s`);
  console.log(`标题: ${report.title}`);
  console.log(`步骤数: ${steps.length}`);
  console.log(`综合分: ${report.overall_score}`);
  console.log(`改进建议[0]: ${report.recommendations?.[0]?.slice(0, 60)}`);

  if (steps.length !== 18) {
    console.error("❌ 步骤数不是 18");
    process.exit(1);
  }

  const objectives = steps.map((s) => s.learning_objectives || "");
  const uniqueObj = new Set(objectives.map((o) => excerpt(o, 120)));
  console.log(`\nlearning_objectives 唯一度: ${uniqueObj.size}/18`);

  const hasCityTemplate = (report.recommendations || []).some(
    (r) => r.includes("公园城市") || r.includes("重庆"),
  );
  if (hasCityTemplate) console.warn("⚠️ 改进建议仍含城市模板");

  const dupPairs: string[] = [];
  for (let i = 0; i < steps.length; i++) {
    for (let j = i + 1; j < steps.length; j++) {
      const a = excerpt(objectives[i], 100);
      const b = excerpt(objectives[j], 100);
      if (a.length > 40 && a === b) dupPairs.push(`${i + 1} vs ${j + 1}`);
    }
  }
  if (dupPairs.length) console.warn("⚠️ 重复步骤对:", dupPairs.slice(0, 5).join(", "));
  else console.log("✓ 18 步 learning_objectives 无明显完全重复");

  console.log("\n--- 抽样 3 步 ---");
  for (const n of [1, 9, 18]) {
    const s = steps[n - 1];
    console.log(`\n第${n}步 ${s.title}:`);
    console.log(`  落地方法: ${excerpt(s.learning_objectives || "")}…`);
    console.log(`  现状复盘: ${excerpt(s.brand_practice || "")}…`);
  }

  const score =
    uniqueObj.size >= 15 && !hasCityTemplate && steps.length === 18 ? "PASS" : "REVIEW";
  console.log(`\n=== 结果: ${score} ===\n`);
}

main().catch((e) => {
  console.error("FAIL", e);
  process.exit(1);
});
