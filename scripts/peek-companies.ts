import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const companies = await prisma.entity.count({ where: { type: "company" } });
  const withReport = await prisma.entity.findFirst({
    where: { type: "company", reports: { some: {} } },
    include: { reports: true, profile: true },
    orderBy: { createdAt: "desc" },
  });
  console.log("Company count:", companies);
  if (withReport) {
    const steps = withReport.reports[0]?.contentJson
      ? (JSON.parse(withReport.reports[0].contentJson) as { steps?: unknown[] }).steps?.length
      : 0;
    console.log("Latest with report:", withReport.slug, "| steps:", steps);
    console.log("URLs: /company/" + withReport.slug, "/report/company/" + withReport.slug);
  } else {
    console.log("No company with report yet");
  }
}

main().finally(() => prisma.$disconnect());
