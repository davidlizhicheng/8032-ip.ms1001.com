"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2 } from "lucide-react";
import { parseJsonResponse } from "@/lib/auth/client";
import { reportPath } from "@/lib/utils/entity-paths";

type Props = {
  slug: string;
  entityType: string;
  entityName: string;
  className?: string;
  label?: string;
  compact?: boolean;
};

export function GenerateReportButton({
  slug,
  entityType,
  entityName,
  className = "",
  label = "生成 18 步品牌报告",
  compact = false,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  async function handleGenerate() {
    setLoading(true);
    setError("");
    setStatus("正在一次性生成 18 步报告（约 2–5 分钟）…");
    try {
      const res = await fetch("/api/reports/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const data = await parseJsonResponse<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "生成失败");
      router.push(reportPath(entityType, slug));
      router.refresh();
    } catch (e) {
      const message = e instanceof Error ? e.message : "生成失败";
      setError(message);
      setStatus("");
      if (compact) window.alert(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-orange-500 px-5 py-3.5 text-sm font-semibold text-white shadow-md hover:from-fuchsia-500 hover:to-orange-400 disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
        {loading ? "生成中…" : label}
      </button>
      {status && !compact && <p className="mt-2 text-center text-xs text-slate-500">{status}</p>}
      {error && !compact && <p className="mt-2 text-center text-xs text-red-600">{error}</p>}
      {!loading && !error && !compact && (
        <p className="mt-2 text-center text-[11px] text-slate-400">
          为「{entityName}」逐步生成文字报告（无需配图也可完成）
        </p>
      )}
    </div>
  );
}
