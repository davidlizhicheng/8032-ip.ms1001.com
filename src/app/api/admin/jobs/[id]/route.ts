import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Props) {
  const { id } = await params;
  const job = await prisma.generationJob.findUnique({
    where: { id },
    include: { items: { include: { entity: true } } },
  });
  if (!job) return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  return NextResponse.json(job);
}
