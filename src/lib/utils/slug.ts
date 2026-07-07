export function slugify(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return `card-${Date.now()}`;

  const pinyinLike = trimmed
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9\u4e00-\u9fff-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (pinyinLike && /^[a-z0-9-]+$/.test(pinyinLike)) {
    return pinyinLike;
  }

  return `user-${Date.now().toString(36)}`;
}

export async function ensureUniqueSlug(
  baseSlug: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  while (await exists(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  return slug;
}
