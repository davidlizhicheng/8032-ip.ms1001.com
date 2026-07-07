"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Play,
  CheckCircle,
  XCircle,
  Search,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { PersonDisambiguationPanel } from "@/components/person/PersonDisambiguationPanel";
import {
  batchPersonSelectionsComplete,
  type BatchAmbiguousPerson,
} from "@/lib/services/batch-disambiguation-shared";
import {
  BATCH_PRODUCTION_ENABLED,
  BATCH_PRODUCTION_CLOSED_HINT,
} from "@/lib/config/batch-production";

const SAMPLE_CITIES = `深圳
广州
杭州
成都
苏州
东莞
佛山
武汉
长沙
合肥`;

const SAMPLE_COMPANIES = `华为
腾讯
比亚迪
大疆
迈瑞医疗
蜜雪冰城
胖东来
名创优品`;

const SAMPLE_PERSONS = `马云
任正非
马化腾
王传福
汪滔
雷军
俞敏洪
示例人物A`;

type ResearchStep = {
  phase: string;
  label: string;
  detail?: string;
  url?: string;
  status: string;
};

type PipelineEvent = {
  type: string;
  stage?: string;
  timestamp: string;
  message?: string;
  title?: string;
  url?: string;
  section?: string;
  [key: string]: unknown;
};

type JobItem = {
  id: string;
  name: string;
  status: string;
  entityId?: string | null;
  error?: string | null;
  researchLog?: string | null;
};

type JobResult = {
  id: string;
  status: string;
  successCount: number;
  failedCount: number;
  totalCount: number;
  items?: JobItem[];
  errorLog?: string | null;
};

function parseJobLog(raw?: string | null): { steps: ResearchStep[]; pipelineEvents: PipelineEvent[] } {
  if (!raw) return { steps: [], pipelineEvents: [] };
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) return { steps: parsed as ResearchStep[], pipelineEvents: [] };
    const obj = parsed as {
      steps?: ResearchStep[];
      pipelineEvents?: Array<{ type?: string; stage?: string; timestamp?: string; data?: Record<string, unknown> }>;
    };
    return {
      steps: obj.steps || [],
      pipelineEvents: (obj.pipelineEvents || []).map((e) => ({
        type: e.type || "status",
        stage: e.stage,
        timestamp: e.timestamp || "",
        ...(e.data || {}),
      })),
    };
  } catch {
    return { steps: [], pipelineEvents: [] };
  }
}

/** @deprecated use parseJobLog */
function parseResearchLog(raw?: string | null): ResearchStep[] {
  return parseJobLog(raw).steps;
}

function stepIcon(status: string) {
  if (status === "done") return <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />;
  if (status === "error") return <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />;
  if (status === "running") return <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-500 shrink-0" />;
  return <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />;
}

export default function AdminBatchPage() {
  const router = useRouter();
  const [names, setNames] = useState(SAMPLE_PERSONS);
  const [entityType, setEntityType] = useState("person");
  const [fetchNews, setFetchNews] = useState(true);
  const [generateReport, setGenerateReport] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<JobResult | null>(null);
  const [ambiguousPersons, setAmbiguousPersons] = useState<BatchAmbiguousPerson[]>([]);
  const [personSelections, setPersonSelections] = useState<Record<string, string>>({});
  const [showDisambiguation, setShowDisambiguation] = useState(false);
  const [liveEvents, setLiveEvents] = useState<PipelineEvent[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sseRef = useRef<EventSource | null>(null);

  const pollJob = useCallback(async (jobId: string) => {
    const res = await fetch(`/api/admin/jobs/${jobId}`);
    const data = (await res.json()) as JobResult;
    if (!res.ok) return null;
    setResult(data);
    return data;
  }, []);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      sseRef.current?.close();
    };
  }, []);

  const activeItem = result?.items?.find((i) => i.status === "running") || result?.items?.[0];
  const activeLog = parseJobLog(activeItem?.researchLog);

  // SSE 实时流水线进度
  useEffect(() => {
    if (!loading || !result?.id || !activeItem?.id || activeItem.status !== "running") {
      sseRef.current?.close();
      sseRef.current = null;
      return;
    }

    const url = `/api/jobs/${result.id}/stream?itemId=${encodeURIComponent(activeItem.id)}`;
    const es = new EventSource(url);
    sseRef.current = es;

    const handlers = ["status", "source", "section", "image", "video", "done", "error"] as const;
    for (const type of handlers) {
      es.addEventListener(type, (ev) => {
        try {
          const data = JSON.parse((ev as MessageEvent).data) as PipelineEvent;
          setLiveEvents((prev) => [...prev.slice(-80), { ...data, type }]);
        } catch {
          // ignore
        }
      });
    }

    es.onerror = () => {
      es.close();
    };

    return () => {
      es.close();
    };
  }, [loading, result?.id, activeItem?.id, activeItem?.status]);

  function buildPersonCandidatePayload(selections: Record<string, string>) {
    const payload: Record<string, { id: string; url?: string; source?: string; label?: string }> = {};
    for (const [name, id] of Object.entries(selections)) {
      const candidate = ambiguousPersons
        .find((item) => item.name === name)
        ?.candidates.find((item) => item.id === id);
      if (!id) continue;
      payload[name] = {
        id,
        url: candidate?.url,
        source: candidate?.source,
        label: candidate?.label,
      };
    }
    return payload;
  }
  async function startBatchJob(personCandidates: Record<string, string> = {}) {
    const candidatePayload = buildPersonCandidatePayload(personCandidates);
    setLoading(true);
    setResult(null);
    setLiveEvents([]);
    setShowDisambiguation(false);
    if (pollRef.current) clearInterval(pollRef.current);

    try {
      const res = await fetch("/api/admin/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          names,
          entityType,
          fetchNews,
          generateReport,
          personCandidates: Object.keys(candidatePayload).length ? candidatePayload : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "生成失败");

      const jobId = data.id as string;
      setResult(data);

      pollRef.current = setInterval(async () => {
        const job = await pollJob(jobId);
        if (!job || job.status === "completed" || job.status === "failed") {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          setLoading(false);
          if (job && job.successCount > 0) {
            router.push(`/?fromBatch=${jobId}`);
          }
        }
      }, 1500);

      await pollJob(jobId);
    } catch (err) {
      alert(err instanceof Error ? err.message : "生成失败");
      setLoading(false);
    }
  }

  async function handleSubmit() {
    const nameList = names
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    if (entityType === "person" || entityType === "auto") {
      try {
        const pre = await fetch("/api/admin/batch/precheck", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ names: nameList, entityType }),
        });
        const data = await pre.json();
        if (!pre.ok) throw new Error(data.error || "重名检查失败");

        if (data.ambiguous?.length) {
          setAmbiguousPersons(data.ambiguous);
          setShowDisambiguation(true);
          setPersonSelections((prev) => {
            const next = { ...prev };
            for (const item of data.ambiguous as BatchAmbiguousPerson[]) {
              if (!next[item.name]) next[item.name] = "";
            }
            return next;
          });
          return;
        }
      } catch (err) {
        alert(err instanceof Error ? err.message : "重名检查失败");
        return;
      }
    }

    await startBatchJob(personSelections);
  }

  async function handleConfirmDisambiguation() {
    if (!batchPersonSelectionsComplete(ambiguousPersons, personSelections)) {
      alert("请先为每位重名人物选择身份");
      return;
    }
    await startBatchJob(personSelections);
  }

  const displayEvents =
    liveEvents.length > 0 ? liveEvents : activeLog.pipelineEvents;
  const displaySteps = activeLog.steps;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <Link href="/" className="text-slate-400 hover:text-slate-600">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold">
              批量生成中心
              {!BATCH_PRODUCTION_ENABLED && (
                <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                  暂未开通
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-500">深度检索百科/维基/新闻/网页，生成过程实时显示资料来源</p>
            <p className="text-xs text-amber-700">人物会先检索百度百科/维基百科，确认身份后再生成</p>
          </div>
          <Link href="/admin/jobs" className="text-sm text-purple-600 hover:underline">任务列表</Link>
          <Link href="/admin/review" className="text-sm text-emerald-600 hover:underline">待审核</Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {!BATCH_PRODUCTION_ENABLED && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              批量生产暂未开通
            </p>
            <p className="mt-2 text-sm leading-relaxed text-amber-800">{BATCH_PRODUCTION_CLOSED_HINT}</p>
            <Link
              href="/create"
              className="mt-3 inline-block text-sm font-medium text-orange-700 hover:underline"
            >
              前往单独生成 →
            </Link>
          </div>
        )}
        <div className={`rounded-2xl border bg-white p-6 shadow-sm ${!BATCH_PRODUCTION_ENABLED ? "pointer-events-none opacity-50" : ""}`}>
          <div className="mb-4 flex flex-wrap gap-2">
            {[
              ["城市示例", SAMPLE_CITIES],
              ["企业示例", SAMPLE_COMPANIES],
              ["人物示例", SAMPLE_PERSONS],
            ].map(([label, text]) => (
              <button
                key={label}
                type="button"
                onClick={() => setNames(text)}
                className="rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
              >
                {label}
              </button>
            ))}
          </div>

          <textarea
            rows={12}
            className="w-full rounded-xl border px-4 py-3 font-mono text-sm"
            value={names}
            onChange={(e) => setNames(e.target.value)}
            placeholder="每行输入一个城市/企业/人物名称"
          />

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <label className="text-sm font-medium">实体类型</label>
              <select
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                value={entityType}
                onChange={(e) => setEntityType(e.target.value)}
              >
                <option value="auto">自动识别</option>
                <option value="city">城市</option>
                <option value="company">企业</option>
                <option value="person">人物</option>
                <option value="brand">品牌</option>
                <option value="profession">职业</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={fetchNews} onChange={(e) => setFetchNews(e.target.checked)} />
              抓取新闻报道
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={generateReport} onChange={(e) => setGenerateReport(e.target.checked)} />
              生成18步分析报告
            </label>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || showDisambiguation || !BATCH_PRODUCTION_ENABLED}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {loading ? "检索与生成中…" : "开始批量生成"}
          </button>
          <p className="mt-2 text-xs text-slate-500">
            人物会先检索百度百科/维基百科并确认身份，再开始生成档案与18步报告。
          </p>
        </div>

        {showDisambiguation && ambiguousPersons.length > 0 && (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-amber-900">
                <AlertTriangle className="h-4 w-4" />
                批量列表中有 {ambiguousPersons.length} 位人物需先确认百科身份
              </p>
              <p className="mt-1 text-xs text-amber-800">
                系统已从百度百科/维基百科检索核心信息；即使只有 1 条结果也需确认。对比模式请用「创建名片」页。
              </p>
            </div>
            {ambiguousPersons.map((item) => (
              <div key={item.name} className="relative">
                {personSelections[item.name] && (
                  <p className="mb-2 text-xs font-medium text-green-700">
                    已选：{item.candidates.find((c) => c.id === personSelections[item.name])?.label}
                  </p>
                )}
                <PersonDisambiguationPanel
                  name={item.name}
                  reason={item.reason}
                  candidates={item.candidates}
                  onSelect={(candidateId) =>
                    setPersonSelections((prev) => ({ ...prev, [item.name]: candidateId }))
                  }
                />
              </div>
            ))}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleConfirmDisambiguation}
                disabled={
                  loading ||
                  !batchPersonSelectionsComplete(ambiguousPersons, personSelections)
                }
                className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                <Play className="h-4 w-4" />
                确认身份并开始生成
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDisambiguation(false);
                  setAmbiguousPersons([]);
                }}
                className="rounded-xl border px-6 py-3 text-sm text-slate-600 hover:bg-slate-50"
              >
                返回修改名单
              </button>
            </div>
          </div>
        )}

        {(loading || result) && (
          <div className="mt-6 space-y-4">
            {activeItem && (displayEvents.length > 0 || displaySteps.length > 0) && (
              <div className="rounded-2xl border border-orange-100 bg-orange-50/50 p-5">
                <h2 className="flex items-center gap-2 font-semibold text-orange-800">
                  <Search className="h-4 w-4" />
                  五段流水线：{activeItem.name}
                  {liveEvents.length > 0 && (
                    <span className="rounded-full bg-orange-200 px-2 py-0.5 text-xs font-normal">实时</span>
                  )}
                </h2>
                {displayEvents.length > 0 && (
                  <ul className="mt-3 max-h-64 space-y-1.5 overflow-y-auto border-b border-orange-100 pb-3">
                    {displayEvents.slice(-30).map((ev, i) => (
                      <li key={`${ev.timestamp}-${i}`} className="flex items-start gap-2 text-sm">
                        <span className="mt-0.5 shrink-0 rounded bg-white px-1.5 py-0.5 text-[10px] font-medium uppercase text-orange-700">
                          {ev.type}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-slate-800">
                            {String(ev.message || ev.title || ev.section || "")}
                          </p>
                          {ev.url && (
                            <a
                              href={String(ev.url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-0.5 inline-flex items-center gap-1 text-xs text-orange-600 hover:underline"
                            >
                              来源 <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {displaySteps.length > 0 && (
                  <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto">
                    {displaySteps.map((step, i) => (
                      <li key={`${step.label}-${i}`} className="flex items-start gap-2 text-sm">
                        {stepIcon(step.status)}
                        <div className="min-w-0 flex-1">
                          <p className="text-slate-800">{step.label}</p>
                          {step.detail && <p className="text-xs text-slate-500">{step.detail}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {result && (
              <div className="rounded-2xl border bg-white p-6">
                <h2 className="font-semibold">生成结果</h2>
                <p className="mt-2 text-sm text-slate-600">
                  状态 {result.status} · 成功 {result.successCount} / 失败 {result.failedCount} / 共 {result.totalCount}
                </p>
                {result.items && (
                  <div className="mt-4 space-y-3">
                    {result.items.map((item) => {
                      const log = parseResearchLog(item.researchLog);
                      return (
                        <div key={item.id} className="rounded-xl border border-slate-100 p-3">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            {item.status === "completed" ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : item.status === "running" ? (
                              <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                            ) : item.status === "failed" ? (
                              <XCircle className="h-4 w-4 text-red-500" />
                            ) : null}
                            {item.name}
                            {item.error && <span className="font-normal text-red-500">{item.error}</span>}
                          </div>
                          {log.length > 0 && (
                            <p className="mt-1 text-xs text-slate-500">
                              检索 {log.filter((s) => s.status === "done").length} 步 ·
                              百科/维基 {log.filter((s) => s.phase === "baike" || s.phase === "wiki").length} 条
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

