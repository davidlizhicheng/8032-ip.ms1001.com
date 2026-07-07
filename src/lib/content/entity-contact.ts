export type EntityContactInfo = {
  phone?: string;
  email?: string;
  wechat?: string;
  address?: string;
};

function trimOrUndefined(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

export function parseEntityContact(contentJson: string | null | undefined): EntityContactInfo {
  if (!contentJson) return {};
  try {
    const parsed = JSON.parse(contentJson) as { contact?: Record<string, unknown> };
    const contact = parsed.contact;
    if (!contact || typeof contact !== "object") return {};
    return {
      phone: trimOrUndefined(contact.phone),
      email: trimOrUndefined(contact.email),
      wechat: trimOrUndefined(contact.wechat),
      address: trimOrUndefined(contact.address),
    };
  } catch {
    return {};
  }
}

export function mergeContactIntoContentJson(
  contentJson: string,
  contact: EntityContactInfo,
): string {
  let base: Record<string, unknown> = { sections: [], tags: [], keywords: [] };
  try {
    const parsed = JSON.parse(contentJson);
    if (parsed && typeof parsed === "object") base = parsed as Record<string, unknown>;
  } catch {
    /* keep default */
  }

  const cleaned: EntityContactInfo = {};
  for (const key of ["phone", "email", "wechat", "address"] as const) {
    const value = trimOrUndefined(contact[key]);
    if (value) cleaned[key] = value;
  }

  if (Object.keys(cleaned).length === 0) {
    const { contact: _removed, ...rest } = base;
    return JSON.stringify(rest);
  }

  return JSON.stringify({ ...base, contact: cleaned });
}

export function hasPublicContact(contact: EntityContactInfo): boolean {
  return Boolean(contact.phone || contact.email || contact.wechat || contact.address);
}
