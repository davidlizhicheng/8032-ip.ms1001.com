"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Loader2, Shield, Star, EyeOff, Eye } from "lucide-react";
import { authFetch } from "@/lib/auth/client";
import { useAuth } from "@/components/auth/AuthProvider";

export default function AdminContentPage() {
  const { user, login, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [entities, setEntities] = useState<Array<Record<string, unknown>>>([]);
  const [cards, setCards] = useState<Array<Record<string, unknown>>>([]);
  const [dragItem, setDragItem] = useState<{ kind: "entity" | "card"; index: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [adDraft, setAdDraft] = useState({
    enabled: true,
    eyebrow: "推荐品牌",
    title: "深圳市了不起品牌管理有限公司",
    description: "专注品牌创新案例研究、品牌名片建设、正向传播与企业品牌增长服务。",
    ctaLabel: "了解品牌服务",
    href: "#",
    imageUrl: "",
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (authLoading || !user) {
        setLoading(false);
        return;
      }
      fetch("/api/admin/content", { method: "HEAD", headers: { Authorization: `Bearer ${localStorage.getItem("suat_access_token") || ""}` } })
        .then((r) => setIsAdmin(r.status === 200))
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [user, authLoading]);

  async function load() {
    setLoading(true);
    const res = await authFetch("/api/admin/content");
    const data = await res.json();
    if (res.ok) {
      setEntities(data.entities || []);
      setCards(data.cards || []);
    } else {
      setMsg(data.error || "加载失败");
    }
    setLoading(false);
  }

  async function loadAd() {
    const res = await authFetch("/api/admin/ad-slot");
    const data = await res.json();
    if (res.ok && data.ad) setAdDraft(data.ad);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (isAdmin) {
        load();
        loadAd();
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isAdmin]);

  async function saveAd() {
    const res = await authFetch("/api/admin/ad-slot", {
      method: "PUT",
      body: JSON.stringify(adDraft),
    });
    const data = await res.json();
    setMsg(data.success ? "广告位已发布" : data.error || "广告位保存失败");
  }

  async function patch(kind: "entity" | "card", id: string, patch: Record<string, unknown>) {
    const res = await authFetch("/api/admin/content", {
      method: "PATCH",
      body: JSON.stringify({ kind, id, ...patch }),
    });
    if (res.ok) await load();
    else {
      const data = await res.json();
      setMsg(data.error || "操作失败");
    }
  }

  function itemRank(item: Record<string, unknown>, fallback: number) {
    return typeof item.manualRankOrder === "number" ? item.manualRankOrder : fallback + 1;
  }

  function rankValue(item: Record<string, unknown>) {
    return typeof item.manualRankOrder === "number" ? String(item.manualRankOrder) : "";
  }

  async function saveRank(kind: "entity" | "card", id: string, value: string) {
    const trimmed = value.trim();
    await patch(kind, id, { manualRankOrder: trimmed ? Number(trimmed) : null });
  }

  async function moveRank(kind: "entity" | "card", items: Array<Record<string, unknown>>, index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    const item = items[index];
    const target = items[targetIndex];
    if (!item || !target) return;
    const currentRank = itemRank(item, index);
    const targetRank = itemRank(target, targetIndex);
    await patch(kind, String(item.id), { manualRankOrder: targetRank });
    await patch(kind, String(target.id), { manualRankOrder: currentRank });
  }

  async function dropRank(kind: "entity" | "card", items: Array<Record<string, unknown>>, targetIndex: number) {
    if (!dragItem || dragItem.kind !== kind || dragItem.index === targetIndex) return;
    const item = items[dragItem.index];
    const target = items[targetIndex];
    if (!item || !target) return;
    setDragItem(null);
    const currentRank = itemRank(item, dragItem.index);
    const targetRank = itemRank(target, targetIndex);
    await patch(kind, String(item.id), { manualRankOrder: targetRank });
    await patch(kind, String(target.id), { manualRankOrder: currentRank });
  }

  async function withdrawAll() {
    if (!confirm("确定撤回全部实体档案？它们将从公开列表消失，需重新批量生成。")) return;
    const res = await authFetch("/api/admin/content?action=withdraw-all", { method: "POST" });
    const data = await res.json();
    setMsg(data.withdrawn != null ? `已撤回 ${data.withdrawn} 条档案` : data.error);
    await load();
  }

  if (authLoading || loading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;
  }

  if (!user) {
    return (
      <div className="p-8 text-center">
        <button type="button" onClick={() => login()} className="rounded-xl bg-zinc-900 px-6 py-3 text-white">管理员登录</button>
      </div>
    );
  }

  if (!isAdmin) {
    return <p className="p-8 text-center text-red-600">需要 ADMIN 角色</p>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <Link href="/">← 首页</Link>
          <h1 className="flex items-center gap-2 text-lg font-bold"><Shield className="h-5 w-5" /> 内容管理</h1>
          <button type="button" onClick={withdrawAll} className="ml-auto rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700">
            撤回全部旧档案
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl space-y-8 px-6 py-8">
        {msg && <p className="text-sm text-green-700">{msg}</p>}
        <section id="ad-slot">
          <h2 className="font-semibold">品牌页广告位</h2>
          <div className="mt-3 grid gap-3 rounded-xl border bg-white p-4 text-sm sm:grid-cols-2">
            {([
              ["eyebrow", "栏目"],
              ["title", "标题"],
              ["description", "文案"],
              ["ctaLabel", "按钮文案"],
              ["href", "跳转链接"],
              ["imageUrl", "图片链接"],
            ] as const).map(([key, label]) => (
              <label key={key} className={key === "description" ? "sm:col-span-2" : ""}>
                <span className="text-xs text-slate-500">{label}</span>
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={String(adDraft[key] || "")}
                  onChange={(e) => setAdDraft((prev) => ({ ...prev, [key]: e.target.value }))}
                />
              </label>
            ))}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={adDraft.enabled}
                onChange={(e) => setAdDraft((prev) => ({ ...prev, enabled: e.target.checked }))}
              />
              启用广告位
            </label>
            <button type="button" onClick={saveAd} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
              发布广告
            </button>
          </div>
        </section>
        <section>
          <h2 className="font-semibold">实体档案 ({entities.length})</h2>
          <p className="mt-1 text-xs text-slate-500">人工顺序数字越小越靠前；留空时交给 AI 分数和系统信号自动排名。</p>
          <ul className="mt-3 space-y-2">
            {entities.map((e, index) => (
              <li
                key={String(e.id)}
                draggable
                onDragStart={() => setDragItem({ kind: "entity", index })}
                onDragEnd={() => setDragItem(null)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  void dropRank("entity", entities, index);
                }}
                className={`flex flex-wrap items-center gap-2 rounded-xl border bg-white p-3 text-sm ${dragItem?.kind === "entity" && dragItem.index === index ? "opacity-50 ring-2 ring-orange-300" : ""}`}
                title="æ‹–åŠ¨è°ƒæ•´æŽ’åº"
              >
                <span className="font-medium">{String(e.name)}</span>
                <span className="text-slate-400">{String(e.type)} · {String(e.visibility)}</span>
                {Boolean(e.isFeatured) && <Star className="h-4 w-4 text-amber-500" />}
                <label className="ml-auto flex items-center gap-1 text-xs text-slate-500">
                  顺序
                  <input
                    defaultValue={rankValue(e)}
                    onBlur={(event) => saveRank("entity", String(e.id), event.currentTarget.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") event.currentTarget.blur();
                    }}
                    className="w-16 rounded border px-2 py-1 text-center text-xs text-slate-800"
                    placeholder="自动"
                    inputMode="numeric"
                  />
                </label>
                <div className="flex gap-1">
                  <Link href={`/${String(e.type)}/${String(e.slug)}`} className="rounded border px-2 py-1 text-xs">查看</Link>
                  <button type="button" onClick={() => patch("entity", String(e.id), { isFeatured: !e.isFeatured })} className="rounded border px-2 py-1 text-xs">推荐</button>
                  <button type="button" onClick={() => patch("entity", String(e.id), { manualRankOrder: 1 })} className="rounded border px-2 py-1 text-xs">置顶</button>
                  <button type="button" onClick={() => moveRank("entity", entities, index, -1)} className="rounded border px-2 py-1 text-xs" title="上移"><ArrowUp className="h-3 w-3 inline" /></button>
                  <button type="button" onClick={() => moveRank("entity", entities, index, 1)} className="rounded border px-2 py-1 text-xs" title="下移"><ArrowDown className="h-3 w-3 inline" /></button>
                  <button type="button" onClick={() => patch("entity", String(e.id), { manualRankOrder: null })} className="rounded border px-2 py-1 text-xs">自动</button>
                  <button type="button" onClick={() => patch("entity", String(e.id), { visibility: "public" })} className="rounded border px-2 py-1 text-xs"><Eye className="h-3 w-3 inline" /></button>
                  <button type="button" onClick={() => patch("entity", String(e.id), { visibility: "admin_hidden" })} className="rounded border px-2 py-1 text-xs"><EyeOff className="h-3 w-3 inline" /></button>
                </div>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="font-semibold">用户名片 ({cards.length})</h2>
          <p className="mt-1 text-xs text-slate-500">管理员可确认认证、控制公开状态，并调整个人名片在公开列表中的顺序。</p>
          <ul className="mt-3 space-y-2">
            {cards.map((c, index) => (
              <li
                key={String(c.id)}
                draggable
                onDragStart={() => setDragItem({ kind: "card", index })}
                onDragEnd={() => setDragItem(null)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  void dropRank("card", cards, index);
                }}
                className={`flex flex-wrap items-center gap-2 rounded-xl border bg-white p-3 text-sm ${dragItem?.kind === "card" && dragItem.index === index ? "opacity-50 ring-2 ring-orange-300" : ""}`}
                title="æ‹–åŠ¨è°ƒæ•´æŽ’åº"
              >
                <span className="font-medium">{String(c.name)}</span>
                <span className="text-slate-400">{String(c.visibility)}</span>
                <span className="text-slate-400">
                  认证：{(() => {
                    const sections = c.sections as Array<{ content?: string }> | undefined;
                    try {
                      const parsed = JSON.parse(sections?.[0]?.content || "{}") as { status?: string };
                      return parsed.status === "approved" ? "已确认" : parsed.status === "rejected" ? "已拒绝" : "待确认";
                    } catch {
                      return "未提交";
                    }
                  })()}
                </span>
                <label className="ml-auto flex items-center gap-1 text-xs text-slate-500">
                  顺序
                  <input
                    defaultValue={rankValue(c)}
                    onBlur={(event) => saveRank("card", String(c.id), event.currentTarget.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") event.currentTarget.blur();
                    }}
                    className="w-16 rounded border px-2 py-1 text-center text-xs text-slate-800"
                    placeholder="自动"
                    inputMode="numeric"
                  />
                </label>
                <div className="flex gap-1">
                  <Link href={`/u/${String(c.slug)}`} className="rounded border px-2 py-1 text-xs">查看</Link>
                  <button type="button" onClick={() => patch("card", String(c.id), { isFeatured: !c.isFeatured })} className="rounded border px-2 py-1 text-xs">推荐</button>
                  <button type="button" onClick={() => patch("card", String(c.id), { manualRankOrder: 1 })} className="rounded border px-2 py-1 text-xs">置顶</button>
                  <button type="button" onClick={() => moveRank("card", cards, index, -1)} className="rounded border px-2 py-1 text-xs" title="上移"><ArrowUp className="h-3 w-3 inline" /></button>
                  <button type="button" onClick={() => moveRank("card", cards, index, 1)} className="rounded border px-2 py-1 text-xs" title="下移"><ArrowDown className="h-3 w-3 inline" /></button>
                  <button type="button" onClick={() => patch("card", String(c.id), { manualRankOrder: null })} className="rounded border px-2 py-1 text-xs">自动</button>
                  <button type="button" onClick={() => patch("card", String(c.id), { visibility: "public", verificationStatus: "approved" })} className="rounded border px-2 py-1 text-xs">确认认证</button>
                  <button type="button" onClick={() => patch("card", String(c.id), { verificationStatus: "pending_review" })} className="rounded border px-2 py-1 text-xs">待确认</button>
                  <button type="button" onClick={() => patch("card", String(c.id), { visibility: "admin_hidden" })} className="rounded border px-2 py-1 text-xs">隐藏</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
