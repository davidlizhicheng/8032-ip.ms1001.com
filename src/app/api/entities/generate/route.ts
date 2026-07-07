import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  generateAndSaveEntity,
  PersonDisambiguationRequiredError,
} from "@/lib/services/entity";
import { authErrorResponse, optionalAuth } from "@/lib/auth/require-auth";
import { reportPath } from "@/lib/utils/entity-paths";

const Schema = z.object({
  name: z.string().min(1),
  companyHint: z.string().optional(),
  entityType: z.string().optional(),
  subtype: z.string().optional(),
  fetchNews: z.boolean().default(true),
  generateReport: z.boolean().default(true),
  confirmedCandidateId: z.string().optional(),
  forUser: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = Schema.parse(body);
    const ctx = await optionalAuth(request);

    if (input.forUser && !ctx?.user.id) {
      return NextResponse.json({ error: "生成品牌报告需先登录" }, { status: 401 });
    }

    const entity = await generateAndSaveEntity(input.name, {
      entityType: input.entityType || (input.forUser ? "person" : undefined),
      subtype: input.subtype,
      fetchNews: input.fetchNews,
      generateReport: input.generateReport,
      confirmedCandidateId: input.confirmedCandidateId,
      companyHint: input.companyHint,
      ownerUserId: input.forUser ? ctx!.user.id : undefined,
      visibility: input.forUser ? "private" : undefined,
      isOfficial: input.forUser ? false : undefined,
      isFeatured: false,
      publish: input.forUser ? true : undefined,
    });

    return NextResponse.json({
      id: entity.id,
      slug: entity.slug,
      type: entity.type,
      reportHref: input.generateReport ? reportPath(entity.type, entity.slug) : undefined,
    });
  } catch (error) {
    if (error instanceof PersonDisambiguationRequiredError) {
      return NextResponse.json(
        {
          status: "needs_confirmation",
          name: error.personName,
          reason: error.reason,
          candidates: error.candidates,
          allowCompare: error.allowCompare,
        },
        { status: 409 },
      );
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "生成失败" },
      { status: 500 },
    );
  }
}
