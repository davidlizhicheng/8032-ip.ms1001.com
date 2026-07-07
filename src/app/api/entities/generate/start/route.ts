import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createSingleGenerateJob,
  startGenerationJob,
} from "@/lib/services/generation-job";
import { optionalAuth } from "@/lib/auth/require-auth";
import { detectEntityType } from "@/lib/ai/detect-type";
import { findReusableEntity } from "@/lib/services/entity-duplicates";
import { prisma } from "@/lib/prisma";

const MAX_REPORTS_PER_USER = 5;

const Schema = z.object({
  name: z.string().min(1),
  companyHint: z.string().optional(),
  entityType: z.enum(["person", "company", "city"]).optional(),
  fetchNews: z.boolean().default(true),
  generateReport: z.boolean().default(true),
  confirmedCandidateId: z.string().optional(),
  forUser: z.boolean().optional(),
  visibility: z.enum(["private", "public"]).optional(),
  forceUpdate: z.boolean().optional(),
});

/** 异步启动生成任务，立即返回 jobId / itemId，前端通过 SSE 订阅进度 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = Schema.parse(body);
    const ctx = await optionalAuth(request);

    const privateOutput = input.visibility === "private" || input.forUser;
    if (privateOutput && !ctx?.user.id) {
      return NextResponse.json({ error: "生成品牌报告需先登录" }, { status: 401 });
    }

    const trimmedName = input.name.trim();
    const detected = detectEntityType(trimmedName, input.entityType || "auto");
    const resolvedType = input.entityType || detected.type;
    if (!input.forceUpdate && ["person", "company", "city"].includes(resolvedType)) {
      const existing = await findReusableEntity({
        name: trimmedName,
        type: resolvedType as "person" | "company" | "city",
        ownerUserId: ctx?.user.id,
      });
      if (existing) {
        return NextResponse.json({
          existing: true,
          message: "已有，请直接访问。",
          entity: existing,
          entityHref: existing.entityHref,
          reportHref: existing.reportHref,
        });
      }
    }

    if (!input.forceUpdate && !ctx?.user.id) {
      return NextResponse.json({ error: "生成案例报告需先登录" }, { status: 401 });
    }

    if (!input.forceUpdate && ctx?.user.id) {
      const reportCount = await prisma.entity.count({
        where: {
          ownerUserId: ctx.user.id,
          reports: { some: {} },
        },
      });
      if (reportCount >= MAX_REPORTS_PER_USER) {
        return NextResponse.json(
          {
            error: `每个账号最多生成 ${MAX_REPORTS_PER_USER} 个案例报告。已有内容可直接访问或一键更新。`,
            code: "REPORT_LIMIT_REACHED",
            limit: MAX_REPORTS_PER_USER,
          },
          { status: 403 },
        );
      }
    }

    const job = await createSingleGenerateJob({
      name: trimmedName,
      entityType: input.entityType,
      companyHint: input.companyHint,
      confirmedCandidateId: input.confirmedCandidateId,
      generateReport: input.generateReport,
      fetchNews: input.fetchNews,
      forUser: privateOutput,
      ownerUserId: ctx?.user.id,
      visibility: input.visibility ?? (privateOutput ? "private" : "public"),
    });

    const item = job.items[0];
    if (!item) {
      return NextResponse.json({ error: "任务创建失败" }, { status: 500 });
    }

    startGenerationJob(job.id);

    return NextResponse.json({
      jobId: job.id,
      itemId: item.id,
      status: "running",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "启动失败" },
      { status: 500 },
    );
  }
}
