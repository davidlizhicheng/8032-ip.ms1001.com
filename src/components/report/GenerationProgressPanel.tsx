"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { parseJsonResponse } from "@/lib/auth/client";
import type { PipelineStage } from "@/lib/agents/types";
import {
  estimateFromEvent,
  formatEta,
  GENERATION_TOTAL_HINT,
  type ProgressSnapshot,
} from "@/lib/generation/progress-estimate";

type DisambiguationPayload = {
  name: string;
  reason: string;
  candidates: Array<{
    id: string;
    label: string;
    title?: string;
    company?: string;
    snippet: string;
    url?: string;
  }>;
  allowCompare?: boolean;
};

type Props = {
  jobId: string;
  itemId: string;
  active: boolean;
  onComplete: (result: { reportHref?: string; entityHref?: string }) => void;
  onDisambiguation: (payload: DisambiguationPayload) => void;
  onError: (message: string) => void;
  onIdle?: () => void;
};

type StreamPayload = {
  stage?: PipelineStage;
  message?: string;
  section?: string;
  status?: string;
};

export function GenerationProgressPanel({
  jobId,
  itemId,
  active,
  onComplete,
  onDisambiguation,
  onError,
  onIdle,
}: Props) {
  const [snapshot, setSnapshot] = useState<ProgressSnapshot>({
    message: "任务已启动，正在准备…",
    progress: 3,
    etaSec: 480,
    phaseLabel: "准备中",
  });
  const handledRef = useRef(false);

  useEffect(() => {
    if (!active || !jobId || !itemId) return;
    handledRef.current = false;

    const poll = async () => {
      if (handledRef.current) return;
      try {
        const res = await fetch(`/api/entities/generate/status/${encodeURIComponent(itemId)}`);
        const data = await parseJsonResponse<{
          status?: string;
          reportHref?: string;
          entityHref?: string;
          error?: string;
        } & DisambiguationPayload>(res);
        if (!res.ok) return;

        if (data.status === "completed") {
          handledRef.current = true;
          setSnapshot((s) => ({ ...s, progress: 100, etaSec: 0, message: "生成完成，链接已准备好" }));
          onComplete({ reportHref: data.reportHref, entityHref: data.entityHref });
          return;
        }
        if (data.status === "needs_confirmation") {
          handledRef.current = true;
          onDisambiguation(data as DisambiguationPayload);
          onIdle?.();
          return;
        }
        if (data.status === "failed") {
          handledRef.current = true;
          onError(data.error || "生成失败");
          onIdle?.();
        }
      } catch {
        /* ignore transient poll errors */
      }
    };

    poll();
    const pollTimer = setInterval(poll, 3000);

    const url = `/api/jobs/${encodeURIComponent(jobId)}/stream?itemId=${encodeURIComponent(itemId)}`;
    const es = new EventSource(url);

    const onEvent = (ev: MessageEvent) => {
      try {
        const data = JSON.parse(ev.data) as StreamPayload;
        if (ev.type === "error") {
          handledRef.current = true;
          onError(data.message || "生成失败");
          onIdle?.();
          return;
        }
        if (ev.type === "done") {
          void poll();
          return;
        }
        if (ev.type === "section") {
          setSnapshot((prev) =>
            estimateFromEvent({
              stage: data.stage,
              message: prev.message,
              section: data.section,
              status: data.status,
            }),
          );
          return;
        }
        if (data.message) {
          setSnapshot(estimateFromEvent(data));
        }
      } catch {
        /* ignore */
      }
    };

    for (const type of ["status", "section", "source", "image", "done", "error"] as const) {
      es.addEventListener(type, onEvent);
    }
    es.onerror = () => es.close();

    return () => {
      clearInterval(pollTimer);
      es.close();
    };
  }, [active, jobId, itemId, onComplete, onDisambiguation, onError, onIdle]);

  if (!active) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 space-y-3">
      <div className="flex items-start gap-2 text-sm text-amber-950">
        <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
        <div className="min-w-0 flex-1">
          <p className="font-medium">{snapshot.message}</p>
          <p className="mt-1 text-xs text-amber-800/90">
            当前阶段：{snapshot.phaseLabel}
            {" · "}
            预计剩余 {formatEta(snapshot.etaSec)}
          </p>
        </div>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-amber-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-orange-500 transition-all duration-700 ease-out"
          style={{ width: `${Math.min(100, Math.max(3, snapshot.progress))}%` }}
        />
      </div>
      <p className="text-xs text-amber-800/80">{GENERATION_TOTAL_HINT}</p>
    </div>
  );
}
