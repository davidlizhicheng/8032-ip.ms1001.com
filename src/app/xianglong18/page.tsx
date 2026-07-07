import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, FileText, Sparkles, User, Building2 } from "lucide-react";
import {
  PERSONAL_IP_18_STEPS,
  PERSONAL_IP_PHASES,
} from "@/lib/ai/personal-ip-18-template";
import {
  BRAND_REVIEW_18_STEPS,
  BRAND_REVIEW_PHASES,
} from "@/lib/ai/brand-report-template";
import { showcaseReportPath } from "@/lib/config/showcase-report";

export const metadata: Metadata = {
  title: "降龙18掌 · 品牌方法论 | AI品牌网",
  description:
    "企业家个人IP降龙18掌与企业品牌复盘18步方法论介绍——立根塑型、内容升维、商业变现、破圈共生。",
};

function StepGrid({
  steps,
  phases,
}: {
  steps: ReadonlyArray<{ step: number; title: string; subtitle: string; xianglong: string }>;
  phases: ReadonlyArray<{
    title: string;
    steps: string;
    subtitle: string;
    stepRange: readonly [number, number];
  }>;
}) {
  return (
    <div className="space-y-8">
      {phases.map((phase) => {
        const phaseSteps = steps.filter(
          (s) => s.step >= phase.stepRange[0] && s.step <= phase.stepRange[1],
        );
        return (
          <div key={phase.title}>
            <div className="mb-4 border-l-4 border-fuchsia-500 pl-4">
              <h3 className="text-lg font-bold text-slate-900">{phase.title}</h3>
              <p className="text-sm text-slate-500">
                {phase.steps} · {phase.subtitle}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {phaseSteps.map((s) => (
                <div
                  key={s.step}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-fuchsia-200"
                >
                  <div className="flex items-center gap-2 text-xs font-semibold text-fuchsia-600">
                    <span className="rounded bg-fuchsia-50 px-2 py-0.5">{s.xianglong}</span>
                    <span className="text-slate-400">STEP {String(s.step).padStart(2, "0")}</span>
                  </div>
                  <h4 className="mt-2 font-semibold text-slate-900">{s.title}</h4>
                  <p className="mt-1 text-sm text-slate-500">{s.subtitle}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Xianglong18Page() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-fuchsia-50 via-white to-orange-50 text-slate-900">
      <header className="border-b border-fuchsia-100/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-4">
          <Link href="/" className="text-slate-500 hover:text-slate-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold">降龙18掌 · 品牌方法论</h1>
            <p className="text-xs text-slate-500">品牌研究院系统手册 · AI 复盘框架</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 pb-20">
        <section className="text-center">
          <p className="text-sm font-medium text-fuchsia-600">方法论 · 可执行 · 可复盘</p>
          <h2 className="mt-3 text-3xl font-black sm:text-4xl">
            降龙18掌
            <span className="block text-xl font-semibold text-slate-600 sm:text-2xl">
              从定位到破圈的品牌成长路径
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-600 leading-relaxed">
            每一「掌」包含落地方法、专业模型、标杆案例、现状复盘、金句作业与核心要点六段式结构。
            输入姓名或单位，AI 按步生成专属复盘报告。
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/report/generate"
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-orange-500 px-6 py-3 font-semibold text-white shadow-md"
            >
              <FileText className="h-5 w-5" />
              输入姓名生成报告
            </Link>
            <Link
              href={showcaseReportPath()}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <Sparkles className="h-5 w-5 text-amber-500" />
              查看样例报告
            </Link>
          </div>
        </section>

        <section className="mt-16 rounded-2xl border border-purple-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100">
              <User className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold">个人品牌 IP · 降龙18掌</h3>
              <p className="text-sm text-slate-500">企业家与超级个体 · 四阶段 18 掌</p>
            </div>
          </div>
          <StepGrid steps={PERSONAL_IP_18_STEPS} phases={PERSONAL_IP_PHASES} />
        </section>

        <section className="mt-10 rounded-2xl border border-orange-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100">
              <Building2 className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold">企业品牌 · 降龙十八掌</h3>
              <p className="text-sm text-slate-500">城市 / 企业 / 品牌 · 调研到升级 18 步</p>
            </div>
          </div>
          <StepGrid steps={BRAND_REVIEW_18_STEPS} phases={BRAND_REVIEW_PHASES} />
        </section>

        <section className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm leading-7 text-slate-600">
          <h3 className="font-semibold text-slate-900">六段式复盘结构（每一步）</h3>
          <ol className="mt-3 list-decimal space-y-1 pl-5">
            <li>落地方法 — 可执行打法与步骤</li>
            <li>专业模型 — 理论工具如何应用</li>
            <li>跨行业标杆案例 — 对照借鉴</li>
            <li>本人物/品牌现状复盘 — 基于公开资料</li>
            <li>金句与落地作业 — 可直接执行的训练</li>
            <li>本掌核心要点 — 浓缩总结</li>
          </ol>
        </section>
      </main>
    </div>
  );
}
