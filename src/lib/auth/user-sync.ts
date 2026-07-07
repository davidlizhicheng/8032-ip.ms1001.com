import { prisma } from "@/lib/prisma";
import type { UnifiedUser } from "./unified-auth";

export async function getOrCreateLocalUser(suatUser: UnifiedUser) {
  const username = suatUser.username;
  const existing = await prisma.user.findUnique({
    where: { unifiedUsername: username },
  });
  if (existing) {
    if (suatUser.name && existing.displayName !== suatUser.name) {
      return prisma.user.update({
        where: { id: existing.id },
        data: { displayName: suatUser.name },
      });
    }
    return existing;
  }
  return prisma.user.create({
    data: {
      unifiedUsername: username,
      displayName: suatUser.name || username,
      phone: /^1\d{10}$/.test(username) ? username : undefined,
    },
  });
}
