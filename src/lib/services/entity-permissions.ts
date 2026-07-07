import { prisma } from "@/lib/prisma";
import type { AuthContext } from "@/lib/auth/require-auth";

export async function canEditEntity(entityId: string, ctx: AuthContext) {
  if (ctx.suatUser.role === "ADMIN") return true;
  const entity = await prisma.entity.findUnique({
    where: { id: entityId },
    select: { ownerUserId: true },
  });
  if (entity?.ownerUserId === ctx.user.id) return true;
  const editor = await prisma.entityEditor.findUnique({
    where: { entityId_userId: { entityId, userId: ctx.user.id } },
    select: { id: true },
  });
  return Boolean(editor);
}

export function snapshotEntity(entity: {
  id: string;
  type: string;
  name: string;
  slug: string;
  status: string;
  visibility: string;
  profile?: {
    title?: string | null;
    subtitle?: string | null;
    summary?: string | null;
    slogan?: string | null;
    contentJson?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    theme?: string | null;
  } | null;
}) {
  return {
    id: entity.id,
    type: entity.type,
    name: entity.name,
    slug: entity.slug,
    status: entity.status,
    visibility: entity.visibility,
    profile: entity.profile || null,
  };
}
