import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireAuth } from "@/lib/auth/require-auth";
import { listUserExchanges } from "@/lib/services/card-exchange";

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireAuth(request);
    const data = await listUserExchanges(ctx.user.id);
    return NextResponse.json(data);
  } catch (error) {
    return authErrorResponse(error);
  }
}
