"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle, ExternalLink, Loader2 } from "lucide-react";
import { authFetch } from "@/lib/auth/client";
import { useAuth } from "@/components/auth/AuthProvider";

type PendingEntity = {
  id: string;
  name: string;
  type: string;
  slug: string;
  status: string;
  updatedAt: string;
  profile?: {
    title?: string;
    summary?: string;
  } | null;
  knowledgeSnapshots?: Array<{
    id: string;
    title: string;
    sourceType: string;
    url?: string | null;
    charCount: number;
  }>;
};

export default function AdminReviewPage() {
  const { user, login, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [entities, setEntities] = useState<PendingEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [publishing, setPublishing] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) {
      setLoading(false);
      return;
    }
    fetch("/api/admin/review", {
      method: "HEAD",
      headers: { Authorization: `Bearer ${localStorage.getItem("suat_access_token") || ""}` },
    })
      .then((r) => setIsAdmin(r.status === 200))
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  async function load() {
    setLoading(true);
    const res = await authFetch("/api/admin/review");
    const data = await res.json();
    if (res.ok) {
      setEntities(data.entities || []);
    } else {
      setMsg(data.error || "加载失败");
    }
    setLoading(false);
  }

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  async function publish(entityId: string) {
    setPublishing(entityId);
    const res = await authFetch("/api/admin/review", {
      method: "POST",
      body: JSON.stringify({ entityId }),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg(`已发布：${data.entity?.name || entityId}`);
      await load();
    } else {
      setMsg(data.error || "发布失败");
    }
    setPublishing(null);
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8 text-center">
        <button type="button" onClick={() => login()} className="rounded-xl bg-zinc-900 px-6 py-3 text-white">
          管理员登录
        </button>
      </div>
    );
  }

  if (!isAdmin) {
    return <p className="p-8 text-center text-red-600">需要 ADMIN 角色</p>;
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/admin/batch" className="text-zinc-500 hover:text-zinc-900">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold">待审核档案</h1>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-800">
          {entities.length} 条
        </span>
      </div>

      {msg && <p className="mb-4 text-sm text-zinc-600">{msg}</p>}

      {entities.length === 0 ? (
        <p className="text-zinc-500">暂无待审核档案。批量生成默认进入 pending_review 状态。</p>
      ) : (
        <ul className="space-y-4">
          {entities.map((entity) => (
            <li key={entity.id} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">{entity.profile?.title || entity.name}</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    {entity.type} · {entity.slug}
                  </p>
                  {entity.profile?.summary && (
                    <p className="mt-2 line-clamp-3 text-sm text-zinc-700">{entity.profile.summary}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/entity/${entity.slug}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm hover:bg-zinc-50"
                  >
                    预览 <ExternalLink className="h-4 w-4" />
                  </Link>
                  <button
                    type="button"
                    disabled={publishing === entity.id}
                    onClick={() => publish(entity.id)}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {publishing === entity.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    发布
                  </button>
                </div>
              </div>

              {entity.knowledgeSnapshots && entity.knowledgeSnapshots.length > 0 && (
                <div className="mt-4 border-t pt-3">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
                    知识快照（三通道来源）
                  </p>
                  <ul className="flex flex-wrap gap-2">
                    {entity.knowledgeSnapshots.map((snap) => (
                      <li
                        key={snap.id}
                        className="rounded-md bg-zinc-100 px-2 py-1 text-xs text-zinc-600"
                        title={snap.url || undefined}
                      >
                        [{snap.sourceType}] {snap.title.slice(0, 24)} ({snap.charCount}字)
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
