"use client";

declare global {
  interface Window {
    suatAccessToken?: () => string;
    suatAppendTokenToUrl?: (url: string, token: string) => string;
    suatCaptureTokenFromUrl?: () => string;
  }
}

export function getAccessToken() {
  if (typeof window === "undefined") return "";
  return window.suatAccessToken?.() || localStorage.getItem("suat_access_token") || "";
}

export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const token = getAccessToken();
  const headers = new Headers(init.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(input, { ...init, headers, credentials: "include" });
}

/** 安全解析 API 响应，避免 HTML 错误页导致 JSON.parse 报错 */
export async function parseJsonResponse<T = Record<string, unknown>>(
  res: Response,
): Promise<T> {
  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error(res.ok ? "服务器返回空响应" : `请求失败 (${res.status})`);
  }
  if (trimmed.startsWith("<") || trimmed.startsWith("<!")) {
    if (res.status === 504 || res.status === 502) {
      throw new Error("生成超时：网关已断开连接。请使用异步生成或稍后重试。");
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error("请先登录后再生成品牌报告");
    }
    throw new Error(
      `服务器返回了异常页面 (HTTP ${res.status})，请确认服务已启动且未超时`,
    );
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    throw new Error(`服务器响应格式异常 (HTTP ${res.status})，请稍后重试`);
  }
}

export function ensureSuatScript() {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.suatAccessToken) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector('script[data-suat="1"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("认证脚本加载失败")), {
        once: true,
      });
      return;
    }
    const script = document.createElement("script");
    script.src = "/suat_auth_redirect.js?v=1";
    script.dataset.suat = "1";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("认证脚本加载失败"));
    document.head.appendChild(script);
  });
}
