import type { PipelineStage } from "@/lib/agents/types";

/** 各阶段进度与剩余时间估算（秒），基于实测约 4–8 分钟总耗时 */
const STAGE_ESTIMATE: Record<
  PipelineStage,
  { progress: number; etaSec: number; phaseLabel: string }
> = {
  entity_lock: { progress: 8, etaSec: 420, phaseLabel: "识别对象" },
  research_plan: { progress: 12, etaSec: 400, phaseLabel: "制定检索计划" },
  search: { progress: 22, etaSec: 360, phaseLabel: "联网检索" },
  fetch: { progress: 38, etaSec: 300, phaseLabel: "抓取正文" },
  evidence: { progress: 48, etaSec: 260, phaseLabel: "整理证据" },
  gap_check: { progress: 52, etaSec: 240, phaseLabel: "补充检索" },
  writing: { progress: 62, etaSec: 220, phaseLabel: "AI 写作" },
  media: { progress: 88, etaSec: 45, phaseLabel: "匹配图片" },
  quality: { progress: 96, etaSec: 15, phaseLabel: "保存入库" },
  done: { progress: 100, etaSec: 0, phaseLabel: "完成" },
  error: { progress: 0, etaSec: 0, phaseLabel: "出错" },
};

export type ProgressSnapshot = {
  message: string;
  stage?: PipelineStage;
  progress: number;
  etaSec: number;
  phaseLabel: string;
  section?: string;
  sectionStatus?: string;
};

export function estimateFromEvent(data: {
  stage?: PipelineStage;
  message?: string;
  section?: string;
  status?: string;
}): ProgressSnapshot {
  const stage = data.stage || "search";
  const base = STAGE_ESTIMATE[stage] || STAGE_ESTIMATE.search;
  let progress = base.progress;
  let etaSec = base.etaSec;

  const msg = data.message || "";
  if (data.section === "品牌18步报告" && data.status === "generating") {
    progress = 72;
    etaSec = 200;
  } else if (msg.includes("18 步") || msg.includes("18步") || msg.includes("降龙")) {
    progress = Math.max(progress, 70);
    etaSec = Math.min(etaSec, 240);
  } else if (msg.includes("报告摘要") || msg.includes("综合评分")) {
    progress = Math.max(progress, 65);
    etaSec = Math.min(etaSec, 280);
  } else if (stage === "writing" && msg.includes("写作完成")) {
    progress = 82;
    etaSec = 90;
  }

  return {
    message: msg || base.phaseLabel,
    stage,
    progress,
    etaSec,
    phaseLabel: base.phaseLabel,
    section: data.section,
    sectionStatus: data.status,
  };
}

export function formatEta(seconds: number): string {
  if (seconds <= 0) return "即将完成";
  if (seconds < 60) return `约 ${seconds} 秒`;
  const min = Math.ceil(seconds / 60);
  if (min <= 1) return "约 1 分钟";
  if (min >= 10) return "约 8–10 分钟";
  return `约 ${min} 分钟`;
}

export const GENERATION_TOTAL_HINT = "全程通常 4–8 分钟，18 步报告阶段最耗时";
