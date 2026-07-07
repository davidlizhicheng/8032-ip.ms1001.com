"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Loader2, Phone, X } from "lucide-react";
import { authFetch } from "@/lib/auth/client";
import { entityPath } from "@/lib/utils/entity-paths";

type ExchangeRow = {
  id: string;
  status: string;
  visitorName?: string | null;
  visitorPhone?: string | null;
  visitorWechat?: string | null;
  visitorMessage?: string | null;
  createdAt: string;
  requesterUser?: { displayName?: string | null; unifiedUsername?: string | null } | null;
  requesterCard?: { name: string; slug: string } | null;
  requesterEntity?: { name: string; slug: string; type: string } | null;
  targetCard?: { name: string; slug: string } | null;
  targetEntity?: { name: string; slug: string; type: string } | null;
};

type PeerView = {
  name: string;
  href: string;
  phone?: string | null;
  email?: string | null;
  wechat?: string | null;
  address?: string | null;
  title?: string | null;
};

export function ExchangeInboxPanel() {
  const [inbox, setInbox] = useState<ExchangeRow[]>([]);
  const [sent, setSent] = useState<ExchangeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [peer, setPeer] = useState<PeerView | null>(null);

  async function load() {
    setLoading(true);
    const res = await authFetch("/api/me/exchanges");
    const data = await res.json();
    if (res.ok) {
      setInbox(data.inbox || []);
      setSent(data.sent || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function respond(id: string, status: "accepted" | "rejected") {
    setMsg("");
    const res = await authFetch(`/api/exchanges/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "处理失败");
      return;
    }
    setMsg(status === "accepted" ? "已通过，双方可互看完整名片。" : "已拒绝该交换请求。");
    await load();
  }

  async function viewPeer(id: string) {
    const res = await authFetch(`/api/exchanges/${id}`);
    const data = await res.json();
    if (res.ok) setPeer(data.peer);
    else setMsg(data.error || "无法查看");
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600">
        交换名片需对方同意后，双方才可查看完整联系方式与名片页。公开档案中的电话等信息，未通过前仅展示已公开部分。
      </p>
      {msg && <p className="rounded-xl bg-green-50 px-4 py-2 text-sm text-green-800">{msg}</p>}

      <section>
        <h2 className="text-lg font-bold text-slate-900">收到的交换请求</h2>
        {inbox.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">暂无待处理请求</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {inbox.map((row) => (
              <li key={row.id} className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {row.requesterCard?.name ||
                        row.requesterEntity?.name ||
                        row.visitorName ||
                        row.requesterUser?.displayName ||
                        "访客"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {row.status === "pending" ? "待处理" : row.status === "accepted" ? "已通过" : "已拒绝"}
                      {" · "}
                      {new Date(row.createdAt).toLocaleString()}
                    </p>
                    {(row.visitorPhone || row.visitorWechat) && (
                      <p className="mt-2 text-sm text-slate-600">
                        {row.visitorPhone && <span>电话 {row.visitorPhone} </span>}
                        {row.visitorWechat && <span>微信 {row.visitorWechat}</span>}
                      </p>
                    )}
                    {row.visitorMessage && (
                      <p className="mt-1 text-sm text-slate-500">{row.visitorMessage}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {row.status === "pending" && (
                      <>
                        <button
                          type="button"
                          onClick={() => respond(row.id, "accepted")}
                          className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          <Check className="h-3.5 w-3.5" /> 通过
                        </button>
                        <button
                          type="button"
                          onClick={() => respond(row.id, "rejected")}
                          className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs text-slate-600"
                        >
                          <X className="h-3.5 w-3.5" /> 拒绝
                        </button>
                      </>
                    )}
                    {row.status === "accepted" && (
                      <button
                        type="button"
                        onClick={() => viewPeer(row.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-purple-200 px-3 py-1.5 text-xs text-purple-700"
                      >
                        <Phone className="h-3.5 w-3.5" /> 查看对方名片
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-bold text-slate-900">我发起的交换</h2>
        {sent.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">暂无记录</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {sent.map((row) => (
              <li key={row.id} className="rounded-2xl border bg-white p-4 text-sm shadow-sm">
                <p className="font-semibold text-slate-900">
                  → {row.targetCard?.name || row.targetEntity?.name || "对方"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {row.status} · {new Date(row.createdAt).toLocaleString()}
                </p>
                {row.status === "accepted" && (
                  <button
                    type="button"
                    onClick={() => viewPeer(row.id)}
                    className="mt-2 text-xs font-semibold text-purple-700 hover:underline"
                  >
                    查看对方完整名片
                  </button>
                )}
                {row.targetEntity && row.status === "accepted" && (
                  <Link
                    href={entityPath(row.targetEntity.type, row.targetEntity.slug)}
                    className="ml-3 text-xs text-orange-600 hover:underline"
                  >
                    打开档案页
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {peer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">{peer.name} · 完整名片</h3>
            <div className="mt-4 space-y-2 text-sm text-slate-700">
              {peer.title && <p>职位：{peer.title}</p>}
              {peer.phone && (
                <p>
                  电话：<a href={`tel:${peer.phone}`} className="font-semibold text-orange-600">{peer.phone}</a>
                </p>
              )}
              {peer.email && <p>邮箱：{peer.email}</p>}
              {peer.wechat && <p>微信：{peer.wechat}</p>}
              {peer.address && <p>地址：{peer.address}</p>}
            </div>
            {peer.href !== "#" && (
              <Link href={peer.href} className="mt-4 inline-block text-sm font-semibold text-fuchsia-700">
                打开名片页 →
              </Link>
            )}
            <button
              type="button"
              onClick={() => setPeer(null)}
              className="mt-4 w-full rounded-xl border py-2 text-sm text-slate-600"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
