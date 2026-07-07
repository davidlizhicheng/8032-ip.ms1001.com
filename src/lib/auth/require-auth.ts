import { NextResponse } from "next/server";
import {
  DEV_MOCK_PAYMENT,
  PLATFORM_KEY,
} from "./config";
import {
  hasPremiumMembership,
  verifyUnifiedToken,
  type UnifiedUser,
} from "./unified-auth";
import { getOrCreateLocalUser } from "./user-sync";
import type { User } from "@/generated/prisma/client";

export class AuthError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status = 401, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function getBearerToken(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7).trim();
  return "";
}

export type AuthContext = {
  token: string;
  suatUser: UnifiedUser;
  user: User;
};

export async function requireAuth(request: Request): Promise<AuthContext> {
  const token = getBearerToken(request);
  if (!token) {
    throw new AuthError("请先登录", 401, "LOGIN_REQUIRED");
  }

  if (DEV_MOCK_PAYMENT && token === "dev-mock-token") {
    const user = await getOrCreateLocalUser({
      username: "dev_user",
      name: "本地测试用户",
      role: "BETA",
      tier: "vip",
    });
    return {
      token,
      suatUser: {
        username: "dev_user",
        name: "本地测试用户",
        role: "BETA",
        tier: "vip",
      },
      user,
    };
  }

  const verified = await verifyUnifiedToken(token);
  if (!verified.valid) {
    throw new AuthError(verified.error || "登录已失效", 401, "LOGIN_REQUIRED");
  }

  const user = await getOrCreateLocalUser(verified.user);
  return { token, suatUser: verified.user, user };
}

export async function optionalAuth(request: Request): Promise<AuthContext | null> {
  const token = getBearerToken(request);
  if (!token) return null;
  try {
    return await requireAuth(request);
  } catch {
    return null;
  }
}

export function hasBrandUpgrade(user: User, suatUser?: UnifiedUser) {
  if (user.brandUpgradeAt) return true;
  if (suatUser && hasPremiumMembership(suatUser, PLATFORM_KEY)) return true;
  return false;
}

export async function requireAdmin(request: Request) {
  const ctx = await requireAuth(request);
  if (ctx.suatUser.role !== "ADMIN") {
    throw new AuthError("需要管理员权限", 403, "ADMIN_REQUIRED");
  }
  return ctx;
}

export async function requireBrandUpgrade(request: Request) {
  const ctx = await requireAuth(request);
  if (!hasBrandUpgrade(ctx.user, ctx.suatUser)) {
    throw new AuthError("请先开通品牌升级（500元）", 402, "UPGRADE_REQUIRED");
  }
  return ctx;
}

export function authErrorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "请求失败" },
    { status: 500 },
  );
}
