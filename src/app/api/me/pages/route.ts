import { NextRequest, NextResponse } from "next/server";
import { getUserPages } from "@/lib/services/content-visibility";
import { authErrorResponse, requireAuth } from "@/lib/auth/require-auth";
import { entityPath, reportPath } from "@/lib/utils/entity-paths";

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireAuth(request);
    const { cards, entities } = await getUserPages(ctx.user.id);
    const pages = [
      ...cards.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        kind: "card" as const,
        visibility: c.visibility,
        isFeatured: c.isFeatured,
        href: `/u/${c.slug}`,
        subtitle: c.title,
      })),
      ...entities.map((e) => ({
        id: e.id,
        slug: e.slug,
        name: e.name,
        kind: "entity" as const,
        type: e.type,
        visibility: e.visibility,
        isFeatured: e.isFeatured,
        href: entityPath(e.type, e.slug),
        reportHref: e.reports[0] ? reportPath(e.type, e.slug) : undefined,
        subtitle: e.profile?.slogan || e.profile?.summary,
      })),
    ];
    return NextResponse.json({ pages });
  } catch (error) {
    return authErrorResponse(error);
  }
}
