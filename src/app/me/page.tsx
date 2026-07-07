"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, ExternalLink, FileText } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { authFetch } from "@/lib/auth/client";
import { VISIBILITY_LABELS, type Visibility } from "@/lib/visibility";

type PageItem = {
  id: string;
  slug: string;
  name: string;
  kind: "card" | "entity";
  type?: string;
  visibility: Visibility;
  isFeatured: boolean;
  href: string;
  reportHref?: string;
  subtitle?: string | null;
};

export default function MeDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      }
    >
      <MeDashboardContent />
    </Suspense>
  );
}

function MeDashboardContent() {
  const searchParams = useSearchParams();
  const createdSlug = searchParams.get("created");
  const reportHref = searchParams.get("report");
  const { user, login, loading: authLoading } = useAuth();
  const [pages, setPages] = useState<PageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    authFetch("/api/me/pages")
      .then((r) => r.json())
      .then((data) => setPages(data.pages || []))
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  async function setVisibility(item: PageItem, visibility: Visibility) {
    setMsg("");
    const path =
      item.kind === "card"
        ? `/api/me/cards/${item.slug}/visibility`
        : `/api/me/entities/${item.slug}/visibility`;
    const res = await authFetch(path, {
      method: "PATCH",
      body: JSON.stringify({ visibility }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "更新失败");
      return;
    }
    setPages((prev) =>
      prev.map((p) => (p.id === item.id ? { ...p, visibility: data.visibility } : p)),
    );
    setMsg(visibility === "public" ? "已设为公开，将出现在对应「全部公开」列表" : "已设为仅自己可见");
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <h1 className="text-xl font-bold">我的品牌页</h1>
        <p className="mt-2 text-slate-600">登录后管理您创建的个人页与可见性</p>
        <button
          type="button"
          onClick={() => login("login")}
          className="mt-6 rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white"
        >
          登录
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Link href="/" className="text-sm text-slate-500 hover:text-orange-600">
            ← 首页
          </Link>
          <h1 className="text-lg font-bold">我的品牌页</h1>
          <Link href="/create" className="ml-auto text-sm text-orange-600 hover:underline">
            创建名片
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-8">
        <p className="text-sm text-slate-600">
          默认仅自己可见。设为「公开」后，会出现在
          <Link href="/library/person" className="mx-1 text-purple-600 hover:underline">
            人物 IP 库 · 全部公开
          </Link>
          （不在首页展示，首页仅官方推荐）。
        </p>
        {msg && <p className="mt-3 text-sm text-green-600">{msg}</p>}
        {createdSlug && (
          <p className="mt-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            名片已创建。
            {reportHref && (
              <>
                {" "}
                <Link href={reportHref} className="font-medium text-purple-700 underline">
                  查看 18 步品牌报告
                </Link>
              </>
            )}
          </p>
        )}
        {pages.length === 0 ? (
          <p className="mt-8 rounded-xl border border-dashed bg-white py-12 text-center text-slate-500">
            您还没有品牌页，
            <Link href="/create" className="text-orange-600 hover:underline">
              去创建名片
            </Link>
          </p>
        ) : (
          <ul className="mt-6 space-y-3">
            {pages.map((item) => (
              <li key={item.id} className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{item.name}</p>
                    <p className="text-xs text-slate-500">
                      {item.kind === "card" ? "个人名片" : `${item.type} 档案`} ·{" "}
                      {VISIBILITY_LABELS[item.visibility]}
                    </p>
                    {item.subtitle && (
                      <p className="mt-1 line-clamp-2 text-sm text-slate-600">{item.subtitle}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={item.href}
                      target="_blank"
                      className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                    >
                      预览 <ExternalLink className="h-3 w-3" />
                    </Link>
                    {item.reportHref && (
                      <Link
                        href={item.reportHref}
                        target="_blank"
                        className="inline-flex items-center gap-1 rounded-lg border border-purple-200 px-3 py-1.5 text-xs text-purple-700 hover:bg-purple-50"
                      >
                        18步报告 <FileText className="h-3 w-3" />
                      </Link>
                    )}
                    {item.visibility === "public" ? (
                      <button
                        type="button"
                        onClick={() => setVisibility(item, "private")}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        <EyeOff className="h-3 w-3" /> 设为私密
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setVisibility(item, "public")}
                        className="inline-flex items-center gap-1 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-500"
                      >
                        <Eye className="h-3 w-3" /> 公开可见
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
