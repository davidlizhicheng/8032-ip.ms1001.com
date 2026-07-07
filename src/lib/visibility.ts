export type Visibility = "private" | "public" | "admin_hidden";

export const VISIBILITY_LABELS: Record<Visibility, string> = {
  private: "仅自己可见",
  public: "公开可见",
  admin_hidden: "管理员已隐藏",
};

export function isPublicVisibility(v: string | null | undefined) {
  return v === "public";
}

export function canViewContent(options: {
  visibility: string;
  ownerUserId?: string | null;
  viewerUserId?: string | null;
  isAdmin?: boolean;
}) {
  if (options.isAdmin) return true;
  if (options.visibility === "admin_hidden") return false;
  if (options.visibility === "public") return true;
  if (options.visibility === "private") {
    return Boolean(
      options.viewerUserId &&
        options.ownerUserId &&
        options.viewerUserId === options.ownerUserId,
    );
  }
  return false;
}

export function listableWhere(type?: string) {
  return {
    ...(type ? { type } : {}),
    visibility: "public" as const,
    status: { in: ["published", "claimed", "verified", "ai_generated"] as string[] },
  };
}

export function featuredWhere(type?: string) {
  return {
    ...listableWhere(type),
    isFeatured: true,
  };
}
