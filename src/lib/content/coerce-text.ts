/** 将 AI 可能返回的非字符串字段安全转为文本 */
export function coerceText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value.map(coerceText).filter(Boolean).join("\n").trim();
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    for (const key of ["text", "content", "value", "summary", "description", "body"]) {
      const inner = obj[key];
      if (typeof inner === "string" && inner.trim()) return inner;
    }
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }
  return String(value);
}
