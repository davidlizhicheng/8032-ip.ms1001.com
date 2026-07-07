import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse, optionalAuth, requireAdmin } from "@/lib/auth/require-auth";
import {
  listPendingReviewEntities,
  publishEntity,
} from "@/lib/services/knowledge-snapshot";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const entities = await listPendingReviewEntities(50);
    return NextResponse.json({ entities });
  } catch (error) {
    return authErrorResponse(error);
  }
}

const PublishSchema = z.object({
  entityId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const body = PublishSchema.parse(await request.json());
    const entity = await publishEntity(body.entityId);
    return NextResponse.json({ success: true, entity });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return authErrorResponse(error);
  }
}

export async function HEAD(request: NextRequest) {
  const ctx = await optionalAuth(request);
  return new NextResponse(null, {
    status: ctx?.suatUser.role === "ADMIN" ? 200 : 403,
  });
}
