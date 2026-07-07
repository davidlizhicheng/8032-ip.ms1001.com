/**
 * 企业档案端到端验证：Research → Evidence → Writing(18步) → Media → Save
 * 用法: npx tsx scripts/test-e2e-company.ts [公司名] [--no-report]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { runProductionPipeline } from "../src/lib/agents/production-pipeline";
import type { PipelineStreamEvent } from "../src/lib/agents/types";

const name = process.argv.find((a) => !a.startsWith("-") && a !== process.argv[0] && a !== process.argv[1]) || "蜜雪冰城";
const generateReport = !process.argv.includes("--no-report");

async function main() {
  const started = Date.now();
  console.log("=== E2E Company Pipeline ===");
  console.log("Company:", name);
  console.log("Generate 18-step report:", generateReport);
  console.log("Providers:", [
    process.env.EXA_API_KEY && "exa",
    process.env.TAVILY_API_KEY && "tavily",
    process.env.FIRECRAWL_API_KEY && "firecrawl",
  ].filter(Boolean).join(", "));
  console.log("");

  const events: PipelineStreamEvent[] = [];

  const result = await runProductionPipeline(
    {
      name,
      entityType: "company",
      fetchNews: true,
      generateReport,
      publish: false,
      visibility: "public",
    },
    {
      onEvent: (e) => {
        events.push(e);
        if (e.type === "status") {
          console.log(`[${e.stage || "?"}] ${e.data.message || ""}`);
        }
        if (e.type === "source") {
          console.log(`  + source [${e.data.provider || e.data.method}] ${String(e.data.title || "").slice(0, 40)}`);
        }
        if (e.type === "section") {
          console.log(`[section] ${e.data.section} → ${e.data.status}`);
        }
        if (e.type === "done") {
          console.log("[done]", JSON.stringify(e.data));
        }
      },
    },
  );

  const entity = await prisma.entity.findUnique({
    where: { id: result.entityId },
    include: { profile: true, reports: true, sources: true, mediaAssets: true },
  });

  if (!entity) {
    throw new Error("Entity not found after pipeline");
  }

  let stepCount = 0;
  let hasSixSections = false;
  const report = entity.reports[0];
  if (report?.contentJson) {
    const content = JSON.parse(report.contentJson) as { steps?: Array<Record<string, unknown>> };
    stepCount = content.steps?.length || 0;
    const first = content.steps?.[0];
    if (first) {
      hasSixSections = Boolean(
        first.learning_objectives &&
          first.theory_tools &&
          first.reference_cases &&
          first.brand_practice &&
          first.practical_training &&
          first.summary_lessons,
      );
    }
  }

  const elapsed = Math.round((Date.now() - started) / 1000);
  const sections = entity.profile?.contentJson
    ? (JSON.parse(entity.profile.contentJson) as { sections?: unknown[] }).sections?.length || 0
    : 0;

  console.log("\n=== E2E Validation ===");
  console.log(`Time: ${elapsed}s`);
  console.log(`Entity slug: ${entity.slug} (status: ${entity.status})`);
  console.log(`Profile summary: ${entity.profile?.summary?.length || 0} chars`);
  console.log(`Profile sections: ${sections}`);
  console.log(`Sources saved: ${entity.sources.length}`);
  console.log(`Evidence pack: ${result.evidencePack.highQualityCount} HQ / ${result.evidencePack.sources.length} total`);
  console.log(`Report generated: ${result.reportGenerated}`);
  if (report) {
    console.log(`Report title: ${report.title}`);
    console.log(`18-step count: ${stepCount}/18 ${stepCount === 18 ? "✓" : "✗"}`);
    console.log(`Step 1 six-section format: ${hasSixSections ? "✓" : "✗"}`);
    const scores = report.scoreJson ? JSON.parse(report.scoreJson) : null;
    console.log(`Overall score: ${scores?.overall ?? "N/A"}`);
  }
  console.log(`Pipeline events: ${events.length}`);
const PORT = process.env.PORT || "3002";
  console.log("\nFrontend URLs (port " + PORT + "):");
  console.log(`  http://127.0.0.1:${PORT}/company/${entity.slug}`);
  console.log(`  http://127.0.0.1:${PORT}/report/company/${entity.slug}`);
  console.log(`  http://127.0.0.1:${PORT}/admin/review`);

  const ok =
    entity.profile?.summary &&
    entity.profile.summary.length > 100 &&
    entity.sources.length >= 3 &&
    (!generateReport || (stepCount === 18 && result.reportGenerated));

  if (!ok) {
    console.error("\nE2E FAILED — see validation above");
    process.exit(1);
  }
  console.log("\nE2E PASSED ✓");
}

main().catch((e) => {
  console.error("E2E ERROR:", e.message || e);
  process.exit(1);
});
