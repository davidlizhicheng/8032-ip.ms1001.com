import Link from "next/link";
import { ArrowRight, Building2, FileText, Sparkles, User } from "lucide-react";
import {
  PERSONAL_IP_18_STEPS,
  PERSONAL_IP_PHASES,
} from "@/lib/ai/personal-ip-18-template";
import {
  BRAND_REVIEW_18_STEPS,
  BRAND_REVIEW_PHASES,
} from "@/lib/ai/brand-report-template";
import { showcaseReportPath } from "@/lib/config/showcase-report";

function PhaseSteps({
  steps,
  phases,
  accent,
}: {
  steps: ReadonlyArray<{ step: number; title: string; subtitle: string; xianglong: string }>;
  phases: ReadonlyArray<{
    title: string;
    steps: string;
    subtitle: string;
    stepRange: readonly [number, number];
  }>;
  accent: "fuchsia" | "orange";
}) {
  const badge =
    accent === "fuchsia"
      ? "bg-fuchsia-100 text-fuchsia-700"
      : "bg-orange-100 text-orange-700";
  const border =
    accent === "fuchsia" ? "border-fuchsia-200" : "border-orange-200";

  return (
    <div className="space-y-6">
      {phases.map((phase) => {
        const phaseSteps = steps.filter(
          (s) => s.step >= phase.stepRange[0] && s.step <= phase.stepRange[1],
        );
        return (
          <div key={phase.title}>
            <div className={`mb-3 rounded-xl border ${border} bg-white/80 px-4 py-3`}>
              <h4 className="font-bold text-slate-900">{phase.title}</h4>
              <p className="text-sm text-slate-500">
                {phase.steps} · {phase.subtitle}
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {phaseSteps.map((s) => (
                <div
                  key={s.step}
                  className="rounded-lg border border-slate-100 bg-white px-3 py-2.5 text-sm shadow-sm"
                >
                  <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${badge}`}>
                    {s.xianglong}
                  </span>
                  <p className="mt-1 font-medium text-slate-900">{s.title}</p>
                  <p className="text-xs text-slate-500">{s.subtitle}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** 首页首屏：降龙18掌（浅色 + 品牌场景图） */
const HERO_IMAGE =
  "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1400&q=80";

export function Xianglong18Hero() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-orange-200/80 bg-gradient-to-br from-orange-50 via-white to-fuchsia-50 shadow-xl">
      <div className="grid lg:grid-cols-2">
        <div className="flex flex-col justify-center px-6 py-10 sm:px-10 sm:py-14 lg:text-left text-center">
          <p className="text-xs font-semibold tracking-[0.35em] text-fuchsia-600">BRAND METHODOLOGY</p>
          <h1 className="mt-4 text-4xl font-black leading-tight text-slate-900 sm:text-5xl">
            降龙
            <span className="bg-gradient-to-r from-fuchsia-600 via-orange-500 to-amber-500 bg-clip-text text-transparent">
              18
            </span>
            掌
          </h1>
          <p className="mt-2 text-lg font-medium text-slate-700 sm:text-xl">
            个人 IP · 企业品牌 · 一套可执行的 18 步复盘体系
          </p>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-600 lg:mx-0 sm:text-base">
            输入姓名或单位，AI 用 <strong className="text-fuchsia-700">18 个不同提示词</strong>
            一次性生成六段式复盘报告——落地方法、专业模型、标杆案例、现状复盘、金句作业、核心要点。
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
            <Link
              href="/report/generate"
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-orange-500 px-7 py-3.5 text-sm font-bold text-white shadow-md hover:from-fuchsia-500 hover:to-orange-400"
            >
              <FileText className="h-5 w-5" />
              立即生成 18 步报告
            </Link>
            <Link
              href={showcaseReportPath()}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-7 py-3.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <Sparkles className="h-5 w-5 text-amber-500" />
              查看胖东来样例
            </Link>
          </div>
          <div className="mx-auto mt-8 grid max-w-md grid-cols-3 gap-3 lg:mx-0">
            {[
              ["18", "关键步骤"],
              ["4", "复盘阶段"],
              ["6", "段式结构"],
            ].map(([n, label]) => (
              <div key={label} className="rounded-xl border border-orange-100 bg-white/80 py-3 shadow-sm">
                <div className="text-2xl font-black text-fuchsia-600">{n}</div>
                <div className="mt-0.5 text-[11px] text-slate-500">{label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative min-h-[240px] lg:min-h-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HERO_IMAGE}
            alt="企业品牌与零售场景"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/40 to-transparent lg:from-white/80" />
          <div className="absolute bottom-4 left-4 right-4 rounded-xl bg-white/85 px-4 py-3 text-left text-xs text-slate-600 shadow backdrop-blur-sm">
            <span className="font-semibold text-slate-900">企业 · 人物 · 城市</span>
            <span className="mx-1">·</span>
            联网检索公开资料，输出可读品牌复盘（非百科原文粘贴）
          </div>
        </div>
      </div>
    </section>
  );
}

/** 案例区之后：个人 + 企业两套 18 步详细介绍 */
export function Xianglong18DetailSections() {
  return (
    <section className="mt-16 space-y-10">
      <div className="text-center">
        <p className="text-sm font-semibold text-fuchsia-600">方法论详解</p>
        <h2 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">
          两套 18 步，覆盖个人 IP 与企业品牌
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-slate-600">
          每一掌/每一步都有独立提示词与六段式输出结构，AI 一次性生成完整报告。
        </p>
      </div>

      <div className="rounded-3xl border border-purple-200 bg-gradient-to-br from-purple-50 to-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-600 text-white">
              <User className="h-6 w-6" />
            </div>
            <div className="text-left">
              <h3 className="text-xl font-bold text-slate-900">个人品牌 IP · 降龙18掌</h3>
              <p className="text-sm text-slate-500">企业家与超级个体 · 立根 → 内容 → 变现 → 破圈</p>
            </div>
          </div>
          <Link
            href="/report/generate"
            className="inline-flex items-center gap-1 text-sm font-semibold text-purple-600 hover:text-purple-800"
          >
            生成人物报告 <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <PhaseSteps steps={PERSONAL_IP_18_STEPS} phases={PERSONAL_IP_PHASES} accent="fuchsia" />
      </div>

      <div className="rounded-3xl border border-orange-200 bg-gradient-to-br from-orange-50 to-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-600 text-white">
              <Building2 className="h-6 w-6" />
            </div>
            <div className="text-left">
              <h3 className="text-xl font-bold text-slate-900">企业品牌 · 降龙十八掌</h3>
              <p className="text-sm text-slate-500">城市 / 企业 · 调研 → 策略 → 落地 → 升级</p>
            </div>
          </div>
          <Link
            href={showcaseReportPath()}
            className="inline-flex items-center gap-1 text-sm font-semibold text-orange-600 hover:text-orange-800"
          >
            查看企业样例 <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <PhaseSteps steps={BRAND_REVIEW_18_STEPS} phases={BRAND_REVIEW_PHASES} accent="orange" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5 text-center text-sm text-slate-600">
        <Link href="/xianglong18" className="font-semibold text-fuchsia-600 hover:underline">
          查看完整方法论页面 →
        </Link>
      </div>
    </section>
  );
}
