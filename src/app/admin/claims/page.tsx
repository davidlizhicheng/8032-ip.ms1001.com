"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ExternalLink, Loader2, X } from "lucide-react";
import { entityPath } from "@/lib/utils/entity-paths";
import { VERIFICATION_METHOD_LABELS } from "@/lib/config/claim-verification";
import { resolveAssetUrl } from "@/lib/storage/public-url";

type ProofFile = { type: string; url: string; title?: string };

type Claim = {
  id: string;
  entityId: string;
  claimType: string;
  companySize?: string | null;
  verificationMethod?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  personalCommitment?: boolean;
  disclaimerAccepted?: boolean;
  proofText: string | null;
  proofFiles: string | null;
  status: string;
  reviewNote: string | null;
  createdAt: string;
  entity: {
    name: string;
    slug: string;
    type: string;
    profile?: { title?: string | null } | null;
  };
};

function parseProofFiles(raw: string | null): ProofFile[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ProofFile[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function AdminClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadClaims() {
    setLoading(true);
    const res = await fetch("/api/admin/claims");
    const data = await res.json();
    setClaims(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => {
    loadClaims();
  }, []);

  async function reviewClaim(id: string, status: "approved" | "rejected") {
    setBusyId(id);
    await fetch(`/api/admin/claims/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await loadClaims();
    setBusyId(null);
  }

  const statusLabel: Record<string, string> = {
    pending: "待审核",
    approved: "已通过",
    rejected: "已拒绝",
  };

  const statusColor: Record<string, string> = {
    pending: "bg-orange-100 text-orange-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
  };

  const pendingCount = claims.filter((c) => c.status === "pending").length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-purple-50">
      <header className="border-b border-orange-100 bg-white/90 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <Link href="/" className="text-slate-400 hover:text-slate-600">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold">认领审核</h1>
            <p className="text-xs text-slate-500">
              执照/工牌、前台照、公司邮箱等材料 · 首次确认后本人可维护
              {pendingCount > 0 && ` · ${pendingCount} 条待处理`}
            </p>
          </div>
          <div className="ml-auto flex gap-3 text-sm">
            <Link href="/admin/batch" className="text-orange-600 hover:underline">批量生成</Link>
            <Link href="/admin/content" className="text-purple-600 hover:underline">内容管理</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-4 px-6 py-8">
        {loading ? (
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
        ) : claims.length === 0 ? (
          <div className="rounded-2xl border bg-white p-10 text-center text-slate-400">
            暂无认领申请
          </div>
        ) : (
          claims.map((claim) => {
            const proofs = parseProofFiles(claim.proofFiles);
            const methodLabel =
              VERIFICATION_METHOD_LABELS[claim.verificationMethod || ""] ||
              claim.verificationMethod ||
              "—";

            return (
              <article key={claim.id} className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor[claim.status] || "bg-slate-100"}`}>
                        {statusLabel[claim.status] || claim.status}
                      </span>
                      <span className="text-xs text-slate-400">{claim.claimType}</span>
                      <span className="text-xs text-slate-400">
                        {claim.companySize === "large" ? "大型企业" : "中小企业"}
                      </span>
                    </div>
                    <h2 className="mt-2 text-lg font-semibold text-slate-900">
                      {claim.entity.profile?.title || claim.entity.name}
                    </h2>
                    <p className="text-xs text-slate-400">
                      {new Date(claim.createdAt).toLocaleString("zh-CN")}
                    </p>
                  </div>
                  <Link
                    href={entityPath(claim.entity.type, claim.entity.slug)}
                    className="inline-flex items-center gap-1 text-sm text-orange-600 hover:underline"
                    target="_blank"
                  >
                    查看页面 <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>

                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-400">联系人</p>
                    <p className="font-medium">{claim.contactName || "—"}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-400">电话</p>
                    <p className="font-medium">{claim.contactPhone || "—"}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-400">公司邮箱</p>
                    <p className="break-all font-medium">{claim.contactEmail || "—"}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-400">认证方式</p>
                    <p className="font-medium">{methodLabel}</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {claim.personalCommitment && (
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">已勾选个人承诺</span>
                  )}
                  {claim.disclaimerAccepted && (
                    <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">已同意免责申明</span>
                  )}
                </div>

                {claim.proofText && (
                  <pre className="mt-4 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                    {claim.proofText}
                  </pre>
                )}

                {proofs.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {proofs.map((file, i) => (
                      <a
                        key={`${file.url}-${i}`}
                        href={resolveAssetUrl(file.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="overflow-hidden rounded-xl border border-slate-100"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={resolveAssetUrl(file.url)}
                          alt={file.title || file.type}
                          className="aspect-[4/3] w-full object-cover"
                        />
                        <p className="px-2 py-1 text-xs text-slate-500">{file.title || file.type}</p>
                      </a>
                    ))}
                  </div>
                )}

                {claim.reviewNote && (
                  <p className="mt-3 text-sm text-slate-500">审核备注：{claim.reviewNote}</p>
                )}

                {claim.status === "pending" && (
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      disabled={busyId === claim.id}
                      onClick={() => reviewClaim(claim.id, "approved")}
                      className="inline-flex items-center gap-1 rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" /> 确认通过（本人可维护）
                    </button>
                    <button
                      type="button"
                      disabled={busyId === claim.id}
                      onClick={() => reviewClaim(claim.id, "rejected")}
                      className="inline-flex items-center gap-1 rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <X className="h-4 w-4" /> 拒绝
                    </button>
                  </div>
                )}
              </article>
            );
          })
        )}
      </main>
    </div>
  );
}
