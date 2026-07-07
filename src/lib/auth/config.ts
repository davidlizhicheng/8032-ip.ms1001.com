export const AUTH_BASE_URL =
  process.env.AUTH_BASE_URL?.replace(/\/$/, "") || "https://ai.ms1001.com";

export const PLATFORM_KEY =
  process.env.PLATFORM_KEY || "ip.ms1001.com";

export const CENTRAL_BILLING_URL =
  process.env.CENTRAL_BILLING_URL?.replace(/\/$/, "") ||
  `${AUTH_BASE_URL}/billing`;

export const BRAND_UPGRADE_PLAN = "brand_upgrade_500";
export const BRAND_UPGRADE_PRICE_YUAN = 500;

export const USE_UNIFIED_AUTH = process.env.USE_UNIFIED_AUTH !== "false";

export const DEV_MOCK_PAYMENT =
  process.env.NODE_ENV !== "production" &&
  process.env.DEV_MOCK_PAYMENT === "true";

export function getLoginUrl(redirectUrl: string, tab: "login" | "register" = "login") {
  const redirect = encodeURIComponent(redirectUrl);
  const tabParam = tab === "register" ? "&tab=register" : "";
  return `${AUTH_BASE_URL}/login?redirect=${redirect}${tabParam}`;
}

export function getBillingUrl(options: {
  returnUrl: string;
  token?: string;
  entityId?: string;
  cardId?: string;
}) {
  const url = new URL(CENTRAL_BILLING_URL);
  url.searchParams.set("platform", PLATFORM_KEY);
  url.searchParams.set("plan", BRAND_UPGRADE_PLAN);
  url.searchParams.set("return", options.returnUrl);
  if (options.entityId) url.searchParams.set("entityId", options.entityId);
  if (options.cardId) url.searchParams.set("cardId", options.cardId);
  const base = url.toString();
  if (options.token) {
    return `${base.split("#")[0]}#access_token=${encodeURIComponent(options.token)}`;
  }
  return base;
}
