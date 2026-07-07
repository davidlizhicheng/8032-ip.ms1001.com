"use client";

import { AlertTriangle, GitCompare, Loader2 } from "lucide-react";

export type DisambiguationCandidate = {
  id: string;
  label: string;
  title?: string;
  company?: string;
  snippet: string;
  url?: string;
  region?: string;
  source?: string;
  summary?: string;
  confidence?: number;
};

type PersonDisambiguationPanelProps = {
  name: string;
  reason: string;
  candidates: DisambiguationCandidate[];
  allowCompare?: boolean;
  loading?: boolean;
  onSelect: (candidateId: string) => void;
  onCompare?: () => void;
};

export function PersonDisambiguationPanel({
  name,
  reason,
  candidates,
  allowCompare,
  loading,
  onSelect,
  onCompare,
}: PersonDisambiguationPanelProps) {
  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div>
          <h2 className="text-lg font-semibold text-slate-900">请先确认：{name} 是谁？</h2>
          <p className="mt-1 text-sm text-slate-600">{reason}</p>
          <p className="mt-2 text-xs text-amber-800">
            确认身份后才会生成 1000–2000 字详细介绍；资料来自百度百科/维基百科检索结果。
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {candidates.map((c) => (
          <button
            key={c.id}
            type="button"
            disabled={loading}
            onClick={() => onSelect(c.id)}
            className="w-full rounded-xl border border-white bg-white p-4 text-left shadow-sm transition hover:border-orange-300 hover:shadow-md disabled:opacity-60"
          >
            <p className="font-medium text-slate-900">{c.label}</p>
            <div className="mt-0.5 flex flex-wrap gap-2 text-xs font-medium text-orange-600">
              {c.region && <span>{c.region}</span>}
              {c.source && <span>{c.source}</span>}
              {typeof c.confidence === "number" && <span>{Math.round(c.confidence * 100)}%</span>}
            </div>
            {(c.title || c.company) && (
              <p className="mt-1 text-sm text-orange-700">
                {[c.title, c.company].filter(Boolean).join(" Â· ")}
              </p>
            )}
            <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-500">{c.snippet}</p>
          </button>
        ))}
      </div>

      {allowCompare && onCompare && candidates.length >= 2 && (
        <button
          type="button"
          disabled={loading}
          onClick={onCompare}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-300 bg-white py-3 text-sm font-semibold text-amber-900 transition hover:bg-amber-100 disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <GitCompare className="h-4 w-4" />
          )}
          对比以上 {Math.min(candidates.length, 2)} 位同名者（1000–2000 字）
        </button>
      )}
    </section>
  );
}


