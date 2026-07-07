import type { PipelineStreamEvent, PipelineContext } from "@/lib/agents/types";

/** 内存事件总线：供 SSE 订阅 */
const jobBuffers = new Map<string, PipelineStreamEvent[]>();
const jobListeners = new Map<string, Set<(e: PipelineStreamEvent) => void>>();

export function createStreamEmitter(ctx: PipelineContext) {
  const jobKey = ctx.itemId || ctx.jobId || "anonymous";

  function emit(type: PipelineStreamEvent["type"], data: Record<string, unknown>, stage?: PipelineStreamEvent["stage"]) {
    const event: PipelineStreamEvent = {
      type,
      stage,
      timestamp: new Date().toISOString(),
      data,
    };
    const buf = jobBuffers.get(jobKey) || [];
    buf.push(event);
    if (buf.length > 500) buf.splice(0, buf.length - 500);
    jobBuffers.set(jobKey, buf);
    for (const fn of jobListeners.get(jobKey) || []) fn(event);
    ctx.onEvent?.(event);
    return event;
  }

  return {
    status: (message: string, stage?: PipelineStreamEvent["stage"], extra?: Record<string, unknown>) =>
      emit("status", { message, ...extra }, stage),
    source: (source: Record<string, unknown>) => emit("source", source, "evidence"),
    section: (section: string, status: string) => emit("section", { section, status }, "writing"),
    image: (image: Record<string, unknown>) => emit("image", image, "media"),
    video: (video: Record<string, unknown>) => emit("video", video, "media"),
    done: (payload: Record<string, unknown>) => emit("done", payload, "done"),
    error: (message: string, detail?: string) => emit("error", { message, detail }, "error"),
  };
}

export function subscribeJobEvents(jobKey: string, listener: (e: PipelineStreamEvent) => void) {
  const set = jobListeners.get(jobKey) || new Set();
  set.add(listener);
  jobListeners.set(jobKey, set);
  return () => {
    set.delete(listener);
    if (set.size === 0) jobListeners.delete(jobKey);
  };
}

export function getJobEventBuffer(jobKey: string): PipelineStreamEvent[] {
  return [...(jobBuffers.get(jobKey) || [])];
}

export function formatSse(event: PipelineStreamEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify({ stage: event.stage, timestamp: event.timestamp, ...event.data })}\n\n`;
}
