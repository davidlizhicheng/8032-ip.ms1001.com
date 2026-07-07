import { NextResponse } from "next/server";
import {
  AUTH_BASE_URL,
  BRAND_UPGRADE_PLAN,
  BRAND_UPGRADE_PRICE_YUAN,
  CENTRAL_BILLING_URL,
  PLATFORM_KEY,
  USE_UNIFIED_AUTH,
  getLoginUrl,
} from "@/lib/auth/config";

export async function GET() {
  return NextResponse.json({
    use_unified_auth: USE_UNIFIED_AUTH,
    unified_auth_url: AUTH_BASE_URL,
    central_billing_url: CENTRAL_BILLING_URL,
    platform_key: PLATFORM_KEY,
    brand_upgrade_plan: BRAND_UPGRADE_PLAN,
    brand_upgrade_price_yuan: BRAND_UPGRADE_PRICE_YUAN,
    login_url_template: getLoginUrl("https://example.com"),
  });
}
