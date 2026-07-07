import { prisma } from "@/lib/prisma";
import { generateAndSaveEntity, PersonDisambiguationRequiredError } from "@/lib/services/entity";
import { detectEntityType } from "@/lib/ai/detect-type";
import type { PipelineStreamEvent } from "@/lib/agents/types";
import type { ResearchStep } from "@/lib/search/research-types";

type ConfirmedPersonCandidate = string | {
  id: string;
  url?: string;
  source?: string;
  label?: string;
};

function candidateId(selection: ConfirmedPersonCandidate | undefined): string | undefined {
  return typeof selection === "string" ? selection : selection?.id;
}

type JobOptions = {
  personCandidates?: Record<string, ConfirmedPersonCandidate>;
  single?: boolean;
  companyHint?: string;
  confirmedCandidateId?: string;
  ownerUserId?: string;
  visibility?: string;
  publish?: boolean;
};

function parseJobOptions(json: string | null): JobOptions {
  if (!json) return {};
  try {
    return JSON.parse(json) as JobOptions;
  } catch {
    return {};
  }
}

async function appendResearchLog(itemId: string, steps: ResearchStep[], events?: PipelineStreamEvent[]) {
  await prisma.generationJobItem.update({
    where: { id: itemId },
    data: {
      researchLog: JSON.stringify({ steps, pipelineEvents: events?.slice(-100) || [] }),
    },
  });
}

export async function processBatchJob(jobId: string) {
  const job = await prisma.generationJob.findUnique({ where: { id: jobId } });
  if (!job) throw new Error("任务不存在");

  await prisma.generationJob.update({
    where: { id: jobId },
    data: { status: "running" },
  });

  const names = job.inputText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  const jobOptions = parseJobOptions(job.optionsJson);
  const personCandidates = jobOptions.personCandidates || {};

  for (const name of names) {
    const item = await prisma.generationJobItem.findFirst({
      where: { jobId, name },
    });

    if (!item) continue;

    const researchSteps: ResearchStep[] = [];
    const pipelineEvents: PipelineStreamEvent[] = [];

    await prisma.generationJobItem.update({
      where: { id: item.id },
      data: { status: "running", researchLog: JSON.stringify({ steps: [], pipelineEvents: [] }) },
    });

    try {
      const entityTypeHint = job.entityType && job.entityType !== "auto" ? job.entityType : undefined;
      const detected = detectEntityType(name, entityTypeHint || "auto");

      const entity = await generateAndSaveEntity(name, {
        entityType: entityTypeHint || detected.type,
        subtype: detected.subtype,
        fetchNews: job.fetchNews,
        generateReport: job.generateReport,
        publish: jobOptions.single ? (jobOptions.publish ?? true) : false,
        visibility: jobOptions.visibility ?? "public",
        isOfficial: jobOptions.single ? !jobOptions.ownerUserId : true,
        isFeatured: jobOptions.single ? undefined : false,
        ownerUserId: jobOptions.ownerUserId,
        companyHint: jobOptions.companyHint,
        confirmedCandidateId:
          jobOptions.confirmedCandidateId || candidateId(personCandidates[name]),
        pipelineJobId: jobId,
        pipelineItemId: item.id,
        onPipelineEvent: (e) => {
          pipelineEvents.push(e);
          void appendResearchLog(item.id, researchSteps, pipelineEvents);
        },
        onResearchProgress: (step) => {
          researchSteps.push(step);
          void appendResearchLog(item.id, researchSteps, pipelineEvents);
        },
      });

      researchSteps.push({
        phase: "ai",
        label: `AI 生成完成：${entity.name}`,
        status: "done",
      });
      await appendResearchLog(item.id, researchSteps);

      await prisma.generationJobItem.update({
        where: { id: item.id },
        data: { status: "completed", entityId: entity.id, entityType: entity.type },
      });
      success++;
    } catch (err) {
      if (err instanceof PersonDisambiguationRequiredError) {
        const payload = JSON.stringify({
          status: "needs_confirmation",
          name: err.personName,
          reason: err.reason,
          candidates: err.candidates,
          allowCompare: err.allowCompare,
        });
        await prisma.generationJobItem.update({
          where: { id: item.id },
          data: { status: "needs_confirmation", error: payload, researchLog: JSON.stringify(researchSteps) },
        });
        await prisma.generationJob.update({
          where: { id: jobId },
          data: { status: "needs_confirmation" },
        });
        return;
      }
      const msg = err instanceof Error ? err.message : "生成失败";
      errors.push(`${name}: ${msg}`);
      researchSteps.push({
        phase: "ai",
        label: `生成失败：${msg}`,
        status: "error",
      });
      await prisma.generationJobItem.update({
        where: { id: item.id },
        data: { status: "failed", error: msg, researchLog: JSON.stringify(researchSteps) },
      });
      failed++;
    }
  }

  await prisma.generationJob.update({
    where: { id: jobId },
    data: {
      status: failed === names.length ? "failed" : "completed",
      successCount: success,
      failedCount: failed,
      errorLog: errors.length ? errors.join("\n") : null,
    },
  });
}

export async function createBatchJob(input: {
  names: string;
  entityType?: string;
  generatePage?: boolean;
  generateReport?: boolean;
  fetchNews?: boolean;
  personCandidates?: Record<string, ConfirmedPersonCandidate>;
}) {
  const nameList = input.names
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const job = await prisma.generationJob.create({
    data: {
      jobType: `batch_${input.entityType || "mixed"}`,
      inputText: input.names,
      entityType: input.entityType || "auto",
      generatePage: input.generatePage ?? true,
      generateReport: input.generateReport ?? true,
      fetchNews: input.fetchNews ?? true,
      optionsJson: input.personCandidates
        ? JSON.stringify({ personCandidates: input.personCandidates })
        : null,
      totalCount: nameList.length,
      items: {
        create: nameList.map((name) => ({ name })),
      },
    },
    include: { items: true },
  });

  return job;
}

export async function createSingleGenerateJob(input: {
  name: string;
  entityType?: string;
  companyHint?: string;
  confirmedCandidateId?: string;
  generateReport?: boolean;
  fetchNews?: boolean;
  forUser?: boolean;
  ownerUserId?: string;
  visibility?: string;
}) {
  const visibility = input.visibility ?? (input.forUser ? "private" : "public");
  const job = await prisma.generationJob.create({
    data: {
      jobType: "single_report",
      inputText: input.name.trim(),
      entityType: input.entityType || "auto",
      generatePage: true,
      generateReport: input.generateReport ?? true,
      fetchNews: input.fetchNews ?? true,
      totalCount: 1,
      optionsJson: JSON.stringify({
        single: true,
        companyHint: input.companyHint,
        confirmedCandidateId: input.confirmedCandidateId,
        ownerUserId: input.ownerUserId,
        visibility,
        publish: true,
      } satisfies JobOptions),
      items: {
        create: [{ name: input.name.trim() }],
      },
    },
    include: { items: true },
  });
  return job;
}

export function startGenerationJob(jobId: string) {
  void processBatchJob(jobId).catch((error) => {
    console.error("[generation-job] failed:", error);
  });
}

