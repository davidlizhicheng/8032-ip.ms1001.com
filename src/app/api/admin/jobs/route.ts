import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const jobs = await prisma.generationJob.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      items: { take: 5 },
      _count: { select: { items: true } },
    },
  });
  return NextResponse.json(jobs);
}
