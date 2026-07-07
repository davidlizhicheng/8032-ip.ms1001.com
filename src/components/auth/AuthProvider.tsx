"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  BRAND_UPGRADE_PRICE_YUAN,
} from "@/lib/auth/config";
import { authFetch, ensureSuatScript, getAccessToken } from "@/lib/auth/client";

type AuthConfig = {
  use_unified_auth: boolean;
  unified_auth_url: string;
};

type AuthUser = {
  id: string;
  username: string;
  name?: string;
  role?: string;
  tier?: string;
};

type AuthState = {
  loading: boolean;
  user: AuthUser | null;
  isAdmin: boolean;
  brandUpgrade: boolean;
  brandUpgradePriceYuan: number;
  refresh: () => Promise<void>;
  login: (tab?: "login" | "register") => void;
  logout: () => void;
  openBilling: (options?: { entityId?: string; cardId?: string }) => Promise<void>;
  confirmUpgrade: (options?: { entityId?: string; cardId?: string }) => Promise<boolean>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [brandUpgrade, setBrandUpgrade] = useState(false);
  const [brandUpgradePriceYuan, setBrandUpgradePriceYuan] = useState(BRAND_UPGRADE_PRICE_YUAN);
  const [authConfig, setAuthConfig] = useState<AuthConfig>({
    use_unified_auth: true,
    unified_auth_url: "https://ai.ms1001.com",
  });

  const refresh = useCallback(async () => {
    try {
      await ensureSuatScript();
      window.suatCaptureTokenFromUrl?.();
      const [cfgRes, meRes] = await Promise.all([
        fetch("/api/auth/config"),
        authFetch("/api/auth/me"),
      ]);
      const cfg = await cfgRes.json();
      setAuthConfig({
        use_unified_auth: Boolean(cfg.use_unified_auth),
        unified_auth_url: cfg.unified_auth_url || "https://ai.ms1001.com",
      });
      const data = await meRes.json();
      if (!meRes.ok) {
        setUser(null);
        setBrandUpgrade(false);
        return;
      }
      setUser(data.user);
      setBrandUpgrade(Boolean(data.brandUpgrade));
      if (data.brandUpgradePriceYuan) {
        setBrandUpgradePriceYuan(data.brandUpgradePriceYuan);
      }
    } catch {
      setUser(null);
      setBrandUpgrade(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("billing") === "return" || params.get("upgrade") === "return") {
      confirmUpgradeInternal().finally(() => {
        params.delete("billing");
        params.delete("upgrade");
        const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
        window.history.replaceState(null, "", next);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function confirmUpgradeInternal(options?: { entityId?: string; cardId?: string }) {
    const res = await authFetch("/api/brand/upgrade", {
      method: "POST",
      body: JSON.stringify(options || {}),
    });
    const data = await res.json();
    if (data.brandUpgrade) {
      setBrandUpgrade(true);
      await refresh();
      return true;
    }
    return false;
  }

  const login = useCallback((tab: "login" | "register" = "login") => {
    if (!authConfig.use_unified_auth) return;
    const base = authConfig.unified_auth_url.replace(/\/$/, "");
    const redirect = encodeURIComponent(window.location.href);
    const tabParam = tab === "register" ? "&tab=register" : "";
    window.location.href = `${base}/login?redirect=${redirect}${tabParam}`;
  }, [authConfig]);

  const logout = useCallback(() => {
    localStorage.removeItem("suat_access_token");
    setUser(null);
    setBrandUpgrade(false);
  }, []);

  const openBilling = useCallback(async (options?: { entityId?: string; cardId?: string }) => {
    await ensureSuatScript();
    const token = getAccessToken();
    if (!token) {
      login("login");
      return;
    }
    const qs = new URLSearchParams({ return: window.location.href });
    if (options?.entityId) qs.set("entityId", options.entityId);
    if (options?.cardId) qs.set("cardId", options.cardId);
    const res = await authFetch(`/api/brand/upgrade?${qs}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "获取支付链接失败");
    if (data.alreadyUpgraded) {
      setBrandUpgrade(true);
      return;
    }
    const target = data.billingUrl as string;
    window.location.href = target;
  }, [login]);

  const isAdmin = user?.role === "ADMIN";

  const value = useMemo<AuthState>(
    () => ({
      loading,
      user,
      isAdmin,
      brandUpgrade,
      brandUpgradePriceYuan,
      refresh,
      login,
      logout,
      openBilling,
      confirmUpgrade: confirmUpgradeInternal,
    }),
    [loading, user, isAdmin, brandUpgrade, brandUpgradePriceYuan, refresh, login, logout, openBilling],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

export function useAuthConfig() {
  return {
    useUnifiedAuth: true,
  };
}
