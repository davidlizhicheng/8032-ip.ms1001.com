import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authErrorResponse, requireAuth } from "@/lib/auth/require-auth";
import { canEditEntity } from "@/lib/services/entity-permissions";

type Params = { params: Promise<{ slug: string }> };

const PatchSchema = z.object({
  reportId: z.string().optional(),
  title: z.string().min(1).optional(),
  summary: z.string().nullable().optional(),
  contentJson: z.string().optional(),
  scoreJson: z.string().nullable().optional(),
  note: z.string().optional(),
});

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const ctx = await requireAuth(request);
    const { slug } = await params;
    const entity = await prisma.entity.findUnique({
      where: { slug },
      include: { reports: { orderBy: { createdAt: "desc" } } },
    });
    if (!entity) return NextResponse.json({ error: "未找到页面" }, { status: 404 });
    if (!(await canEditEntity(entity.id, ctx))) {
      return NextResponse.json({ error: "无权编辑" }, { status: 403 });
    }
    const report = entity.reports[0];
    if (!report) return NextResponse.json({ error: "暂无 AI 报告" }, { status: 404 });
    return NextResponse.json({ report, canEdit: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const ctx = await requireAuth(request);
    const input = PatchSchema.parse(await request.json());
    const { slug } = await params;

    const entity = await prisma.entity.findUnique({
      where: { slug },
      include: { reports: { orderBy: { createdAt: "desc" } } },
    });
    if (!entity) return NextResponse.json({ error: "未找到页面" }, { status: 404 });
    if (!(await canEditEntity(entity.id, ctx))) {
      return NextResponse.json({ error: "无权编辑" }, { status: 403 });
    }

    const report = input.reportId
      ? await prisma.entityReport.findFirst({
          where: { id: input.reportId, entityId: entity.id },
        })
      : entity.reports[0];
    if (!report) return NextResponse.json({ error: "暂无 AI 报告" }, { status: 404 });

    if (input.contentJson) JSON.parse(input.contentJson);
    if (input.scoreJson) JSON.parse(input.scoreJson);

    const updated = await prisma.$transaction(async (tx) => {
      const after = await tx.entityReport.update({
        where: { id: report.id },
        data: {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.summary !== undefined ? { summary: input.summary } : {}),
          ...(input.contentJson !== undefined ? { contentJson: input.contentJson } : {}),
          ...(input.scoreJson !== undefined ? { scoreJson: input.scoreJson } : {}),
        },
      });
      await tx.contentRevision.create({
        data: {
          entityId: entity.id,
          userId: ctx.user.id,
          action: "report_edit",
          beforeJson: JSON.stringify({
            id: report.id,
            title: report.title,
            summary: report.summary,
            contentJson: report.contentJson,
            scoreJson: report.scoreJson,
          }),
          afterJson: JSON.stringify(after),
          note: input.note || "管理员编辑 AI 报告",
        },
      });
      return after;
    });

    return NextResponse.json({ success: true, report: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "JSON 格式不正确" }, { status: 400 });
    }
    return authErrorResponse(error);
  }
}
