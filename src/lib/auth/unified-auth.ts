import { AUTH_BASE_URL } from "./config";

export type PlatformMembership = {
  tier?: string;
  expiresAt?: string;
};

export type UnifiedUser = {
  username: string;
  name?: string;
  role?: string;
  tier?: string;
  platformPermissions?: Record<string, string>;
  platformMemberships?: Record<string, PlatformMembership>;
};

export type VerifyResult =
  | { ok: true; valid: true; user: UnifiedUser }
  | { ok: false; valid: false; error?: string };

const PERM_ORDER = ["none", "read", "write", "full"] as const;

export function canAccessPlatform(
  user: UnifiedUser,
  platformKey: string,
  need: (typeof PERM_ORDER)[number] = "read",
) {
  const perms = user.platformPermissions || {};
  const level = Math.max(
    PERM_ORDER.indexOf((perms["*"] as (typeof PERM_ORDER)[number]) || "none"),
    PERM_ORDER.indexOf((perms[platformKey] as (typeof PERM_ORDER)[number]) || "none"),
  );
  return level >= PERM_ORDER.indexOf(need);
}

export function platformTier(user: UnifiedUser, platformKey: string) {
  const memberships = user.platformMemberships || {};
  const pick = memberships[platformKey] || memberships["*"];
  if (pick?.expiresAt && new Date(pick.expiresAt) < new Date()) {
    return user.tier || "standard";
  }
  return pick?.tier || user.tier || "standard";
}

export function hasPremiumMembership(user: UnifiedUser, platformKey: string) {
  if (user.role === "ADMIN") return true;
  const tier = platformTier(user, platformKey);
  return tier === "vip" || tier === "admin";
}

export async function verifyUnifiedToken(token: string): Promise<VerifyResult> {
  if (!token) {
    return { ok: false, valid: false, error: "缺少 token" };
  }

  try {
    const res = await fetch(`${AUTH_BASE_URL}/api/auth/verify`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as {
      valid?: boolean;
      user?: UnifiedUser;
      error?: string;
    };
    if (!res.ok || !data.valid || !data.user?.username) {
      return {
        ok: false,
        valid: false,
        error: data.error || "登录已失效",
      };
    }
    return { ok: true, valid: true, user: data.user };
  } catch (error) {
    return {
      ok: false,
      valid: false,
      error: error instanceof Error ? error.message : "认证服务不可用",
    };
  }
}
