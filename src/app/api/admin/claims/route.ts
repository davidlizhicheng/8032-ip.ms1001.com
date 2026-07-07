import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const claims = await prisma.claimRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      entity: {
        include: { profile: true },
      },
    },
  });

  return NextResponse.json(claims);
}
