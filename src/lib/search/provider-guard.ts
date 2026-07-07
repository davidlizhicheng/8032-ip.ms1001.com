const disabledUntil = new Map<string, number>();
const COOLDOWN_MS = 15 * 60 * 1000;

export function isQuotaOrRateLimitError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /429|402|rate limit|quota|Insufficient credits|connect timeout|ECONNRESET|ETIMEDOUT/i.test(
    msg,
  );
}

export function isProviderDisabled(name: string): boolean {
  const until = disabledUntil.get(name);
  if (!until) return false;
  if (Date.now() >= until) {
    disabledUntil.delete(name);
    return false;
  }
  return true;
}

export function markProviderDisabled(name: string, ms = COOLDOWN_MS) {
  disabledUntil.set(name, Date.now() + ms);
}

export async function runSearchProvider<T>(
  name: string,
  fn: () => Promise<T>,
  fallback: T,
): Promise<T> {
  if (isProviderDisabled(name)) return fallback;
  try {
    return await fn();
  } catch (error) {
    if (isQuotaOrRateLimitError(error)) {
      markProviderDisabled(name);
    }
    throw error;
  }
}
