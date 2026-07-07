"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Sparkles, FileText, User, Building2, MapPin, ExternalLink, Eye } from "lucide-react";
import { authFetch, parseJsonResponse } from "@/lib/auth/client";
import { PersonDisambiguationPanel } from "@/components/person/PersonDisambiguationPanel";
import { GenerationProgressPanel } from "@/components/report/GenerationProgressPanel";

type PersonCandidate = {
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

export function QuickReportForm({
  initialName = "",
  initialEntityType = "company",
}: {
  initialName?: string;
  initialEntityType?: "person" | "company" | "city";
}) {
  const [name, setName] = useState(initialName);
  const [company, setCompany] = useState("");
  const [entityType, setEntityType] = useState<"person" | "company" | "city">(initialEntityType);
  const [publishPublic, setPublishPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmedCandidateId, setConfirmedCandidateId] = useState<string | undefined>();
  const [disambiguation, setDisambiguation] = useState<{
    name: string;
    reason: string;
    candidates: PersonCandidate[];
    allowCompare?: boolean;
  } | null>(null);
  const [jobMeta, setJobMeta] = useState<{ jobId: string; itemId: string } | null>(null);
  const [generationResult, setGenerationResult] = useState<{ reportHref?: string; entityHref?: string } | null>(null);
  const [existingNotice, setExistingNotice] = useState("");

  const queryName = name.trim();

  async function startGeneration(candidateId?: string) {
    if (!queryName) {
      setError("请输入姓名或单位名称");
      return;
    }
    setLoading(true);
    setError("");
    setJobMeta(null);
    setGenerationResult(null);
    setExistingNotice("");
    try {
      const res = await authFetch("/api/entities/generate/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: queryName,
          companyHint: entityType === "person" ? company.trim() || undefined : undefined,
          entityType,
          generateReport: true,
          fetchNews: true,
          visibility: publishPublic ? "public" : "private",
          confirmedCandidateId: candidateId ?? confirmedCandidateId,
        }),
      });
      const data = await parseJsonResponse<{
        jobId: string;
        itemId: string;
        existing?: boolean;
        message?: string;
        entityHref?: string;
        reportHref?: string;
        error?: string;
      }>(res);
      if (!res.ok) throw new Error(data.error || "启动失败");
      if (data.existing) {
        setExistingNotice(data.message || "已有，请直接访问。");
        setGenerationResult({
          entityHref: data.entityHref,
          reportHref: data.reportHref,
        });
        setLoading(false);
        return;
      }
      setJobMeta({ jobId: data.jobId, itemId: data.itemId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成失败");
      setLoading(false);
    }
  }

  async function handleGenerate(e?: React.FormEvent) {
    e?.preventDefault();
    await startGeneration();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-fuchsia-200 bg-gradient-to-br from-fuchsia-50 to-orange-50 p-6">
        <div className="flex items-start gap-3">
          <FileText className="mt-1 h-6 w-6 shrink-0 text-fuchsia-600" />
          <div>
            <h2 className="text-lg font-bold text-slate-900">降龙18掌 · 个人品牌报告</h2>
            <p className="mt-1 text-sm text-slate-600">
              输入人物、企业或城市名称，AI 联网检索后按手册
              <strong>18掌方法论</strong>输出完整复盘报告，并同步生成品牌名片页。
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleGenerate} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setEntityType("person")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition ${
              entityType === "person"
                ? "border-purple-400 bg-purple-50 text-purple-800"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <User className="h-4 w-4" />
            人物 / 企业家
          </button>
          <button
            type="button"
            onClick={() => setEntityType("company")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition ${
              entityType === "company"
                ? "border-orange-400 bg-orange-50 text-orange-800"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Building2 className="h-4 w-4" />
            企业 / 单位
          </button>
          <button
            type="button"
            onClick={() => setEntityType("city")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition ${
              entityType === "city"
                ? "border-sky-400 bg-sky-50 text-sky-800"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <MapPin className="h-4 w-4" />
            城市品牌
          </button>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            {entityType === "person" ? "姓名" : entityType === "city" ? "城市名称" : "企业 / 单位名称"}
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={entityType === "person" ? "例如：雷军、董明珠" : entityType === "city" ? "例如：成都、杭州" : "例如：胖东来、华为"}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            required
            disabled={loading}
          />
        </div>

        {entityType === "person" && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              所在单位（选填，有助于消歧）
            </label>
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="例如：深圳市超级品牌顾问有限公司"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              disabled={loading}
            />
          </div>
        )}

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <input
            type="checkbox"
            className="mt-1"
            checked={publishPublic}
            onChange={(e) => setPublishPublic(e.target.checked)}
            disabled={loading}
          />
          <span className="text-sm text-slate-700">
            <span className="flex items-center gap-1 font-semibold text-slate-900">
              <Eye className="h-4 w-4" />
              生成后公开到品牌库和榜单
            </span>
            <span className="mt-1 block text-xs leading-5 text-slate-500">
              默认仅自己可见（需登录）；勾选后公开到品牌库和榜单。已有同名品牌会更新文本、图片与评分。
            </span>
          </span>
        </label>

        {disambiguation && (
          <PersonDisambiguationPanel
            name={disambiguation.name}
            reason={disambiguation.reason}
            candidates={disambiguation.candidates}
            allowCompare={disambiguation.allowCompare}
            onSelect={(id) => {
              setConfirmedCandidateId(id);
              setDisambiguation(null);
              setError("");
              void startGeneration(id);
            }}
          />
        )}

        {jobMeta && (
          <GenerationProgressPanel
            jobId={jobMeta.jobId}
            itemId={jobMeta.itemId}
            active={loading}
            onComplete={(result) => {
              setLoading(false);
              setJobMeta(null);
              setGenerationResult(result);
            }}
            onDisambiguation={(payload) => {
              setLoading(false);
              setJobMeta(null);
              setDisambiguation(payload);
              setError("发现同名人物，请先确认身份后再生成");
            }}
            onError={(msg) => {
              setLoading(false);
              setJobMeta(null);
              setError(msg);
            }}
            onIdle={() => setLoading(false)}
          />
        )}

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        {existingNotice && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
            {existingNotice}
          </p>
        )}

        {generationResult && (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
            <h3 className="font-bold text-green-900">生成完成，已同步生成品牌名片页和案例报告</h3>
            <p className="mt-1 text-sm leading-6 text-green-800">
              {publishPublic ? "当前设置：公开可见，可进入榜单排序。" : "当前设置：仅自己可见，可后续在我的品牌页主动公开。"}
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {generationResult.reportHref && (
                <Link
                  href={generationResult.reportHref}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-green-900 shadow-sm"
                >
                  去案例报告
                  <ExternalLink className="h-4 w-4" />
                </Link>
              )}
              {generationResult.entityHref && (
                <Link
                  href={generationResult.entityHref}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-green-900 shadow-sm"
                >
                  去品牌名片
                  <ExternalLink className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-orange-500 px-6 py-3.5 font-semibold text-white shadow-md hover:from-fuchsia-500 hover:to-orange-400 disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              生成中…
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              生成案例报告（推荐）
            </>
          )}
        </button>

        <p className="text-center text-xs text-slate-500">
          生成过程中会显示当前阶段与预计剩余时间。全程通常 4–8 分钟，18 步报告阶段最耗时。
        </p>
      </form>
    </div>
  );
}
