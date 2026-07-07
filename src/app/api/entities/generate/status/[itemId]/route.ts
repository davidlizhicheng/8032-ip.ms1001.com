import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { reportPath } from "@/lib/utils/entity-paths";
import { entityPath } from "@/lib/utils/entity-paths";

type Props = { params: Promise<{ itemId: string }> };

/** 轮询单条生成任务状态（配合 SSE 使用） */
export async function GET(_req: NextRequest, { params }: Props) {
  const { itemId } = await params;
  const item = await prisma.generationJobItem.findUnique({
    where: { id: itemId },
    include: { entity: { select: { id: true, slug: true, type: true, name: true } }, job: true },
  });

  if (!item) {
    return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  }

  if (item.status === "needs_confirmation" && item.error) {
    try {
      const disambiguation = JSON.parse(item.error);
      if (disambiguation.status === "needs_confirmation") {
        return NextResponse.json({
          status: "needs_confirmation",
          ...disambiguation,
        });
      }
    } catch {
      /* fall through */
    }
  }

  if (item.status === "completed" && item.entity) {
    return NextResponse.json({
      status: "completed",
      entity: {
        id: item.entity.id,
        slug: item.entity.slug,
        type: item.entity.type,
        name: item.entity.name,
      },
      reportHref: item.job.generateReport
        ? reportPath(item.entity.type, item.entity.slug)
        : undefined,
      entityHref: entityPath(item.entity.type, item.entity.slug),
    });
  }

  if (item.status === "failed") {
    return NextResponse.json({
      status: "failed",
      error: item.error || "生成失败",
    });
  }

  return NextResponse.json({
    status: item.status,
    name: item.name,
  });
}
