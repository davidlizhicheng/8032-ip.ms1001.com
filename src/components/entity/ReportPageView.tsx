"use client";



import Link from "next/link";

import { useState } from "react";

import { ArrowLeft, ChevronRight, BookOpen, MapPin, Factory, ArrowRight, BadgeCheck, CheckCircle2 } from "lucide-react";

import { getTheme, getDefaultEntityTheme } from "@/lib/themes";

import { getDisclaimer } from "@/lib/compliance/risk-check";

import type { EntityReportContent, ReportSegment, ReportStep } from "@/lib/schemas/entity";

import { entityPath } from "@/lib/utils/entity-paths";
import { resolveAssetUrl } from "@/lib/storage/public-url";
import { EntityLikeButton } from "@/components/entity/EntityLikeButton";

import {
  STEP_SECTION_KEYS,
  resolveStepSectionContent,
  type StepSectionKey,
} from "@/lib/ai/brand-report-template";
import {
  getReportPhasesForType,
  getReportSectionKeysForType,
  isPersonalIpReport,
  type ReportSectionKeyDef,
} from "@/lib/ai/report-framework";
import type { EntityType } from "@/lib/schemas/entity";

import { isPlaceholderContent, sanitizeText } from "@/lib/content/sanitize-placeholder";
import { sanitizeReportField, sanitizeReportMetaField } from "@/lib/content/report-sanitize";



type ReportPageData = {

  entity: {

    id: string;

    type: string;

    name: string;

    slug: string;

    subtype?: string | null;

    isVerified: boolean;

    likeCount?: number;

    profile?: {
      theme?: string;
      title?: string | null;
      subtitle?: string | null;
      coverUrl?: string | null;
      avatarUrl?: string | null;
    } | null;

    mediaAssets?: Array<{ id: string; url: string; type: string; title?: string | null }>;

  };

  report: {

    title: string;

    summary?: string | null;

    contentJson: string;

    scoreJson?: string | null;

  };

};



function reportStepTextFields(step: ReportStep): Record<string, string | undefined> {

  return Object.fromEntries(

    Object.entries(step).map(([key, value]) => [key, typeof value === "number" ? String(value) : value]),

  ) as Record<string, string | undefined>;

}

function stepExcerpt(step: ReportStep, sectionKeys: readonly ReportSectionKeyDef[] = STEP_SECTION_KEYS): string {
  const stepTextFields = reportStepTextFields(step);
  for (const { key, legacy } of sectionKeys) {
    const content = sanitizeReportField(
      sanitizeText(resolveStepSectionContent(stepTextFields, key as StepSectionKey, legacy)),
    );
    if (content.length > 0 && !isPlaceholderContent(content)) {
      return content.length > 160 ? `${content.slice(0, 160)}…` : content;
    }
  }
  return "";
}

function StepOverviewCard({
  step,
  theme,
  sectionKeys = STEP_SECTION_KEYS,
}: {
  step: ReportStep;
  theme: ReturnType<typeof getTheme>;
  sectionKeys?: readonly ReportSectionKeyDef[];
}) {
  const excerpt = stepExcerpt(step, sectionKeys);
  if (!excerpt) return null;

  return (
    <a
      href={`#step-${step.step}`}
      className={`group block rounded-xl border ${theme.border} bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-400/50 hover:shadow-md`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`text-xs font-black tracking-[0.2em] ${theme.scoreAccent}`}>
          STEP {String(step.step).padStart(2, "0")}
        </span>
        <CheckCircle2 className="h-4 w-4 text-amber-500/70" />
      </div>
      <h3 className="mt-3 text-base font-bold leading-snug">{step.title}</h3>
      <p className={`mt-2 line-clamp-4 text-sm leading-relaxed ${theme.muted}`}>{excerpt}</p>
      <span className={`mt-3 inline-flex items-center gap-1 text-xs font-medium ${theme.link}`}>
        展开详情 <ArrowRight className="h-3 w-3" />
      </span>
    </a>
  );
}

function StepCard({
  step,
  theme,
  idPrefix = "",
  sectionKeys = STEP_SECTION_KEYS,
}: {
  step: ReportStep;
  theme: ReturnType<typeof getTheme>;
  idPrefix?: string;
  sectionKeys?: readonly ReportSectionKeyDef[];
}) {
  const stepTextFields = reportStepTextFields(step);
  const sections = sectionKeys.map(({ key, label, legacy }) => ({

    label,

    content: sanitizeReportField(sanitizeText(resolveStepSectionContent(stepTextFields, key as StepSectionKey, legacy))),

  })).filter((s) => s.content.length > 0 && !isPlaceholderContent(s.content));



  if (sections.length === 0) return null;



  return (

    <section

      id={`${idPrefix}step-${step.step}`}

      className={`rounded-2xl border ${theme.border} overflow-hidden`}

    >

      <div className="bg-gradient-to-r from-orange-500/15 via-purple-500/10 to-transparent px-4 py-3">

        <p className={`text-xs font-medium ${theme.scoreAccent}`}>第 {step.step} 步</p>

        <h2 className="text-lg font-bold">{step.title}</h2>

        {step.subtitle && <p className="text-sm opacity-70">——{step.subtitle}</p>}

        {step.xianglong_punch && (

          <p className="mt-1 text-xs text-amber-400/90">

            【{step.xianglong_punch}】{step.xianglong_meaning || ""}

          </p>

        )}

      </div>

      <div className="space-y-4 p-4">

        {sections.map(({ label, content }) => (

          <div key={label}>

            <h3 className={`mb-1.5 text-sm font-semibold ${theme.accent}`}>{label}</h3>

            <p className={`whitespace-pre-wrap text-sm leading-relaxed ${theme.muted}`}>{content}</p>

          </div>

        ))}

      </div>

    </section>

  );

}



function SegmentPanel({

  segment,

  theme,

}: {

  segment: ReportSegment;

  theme: ReturnType<typeof getTheme>;

}) {

  const icon =

    segment.dimension === "city" ? (

      <MapPin className="h-4 w-4" />

    ) : segment.dimension === "industry" ? (

      <Factory className="h-4 w-4" />

    ) : (

      <BookOpen className="h-4 w-4" />

    );



  return (

    <div className="space-y-4">

      <div className={`rounded-xl border ${theme.border} bg-white/5 p-4`}>

        <div className={`mb-2 flex items-center gap-2 text-sm font-semibold ${theme.accent}`}>

          {icon}

          {segment.label}

        </div>

        <p className={`text-sm leading-relaxed ${theme.muted}`}>{segment.summary}</p>

      </div>



      {segment.step_insights && segment.step_insights.length > 0 && (

        <div className={`rounded-2xl border ${theme.border} p-4`}>

          <h3 className={`mb-3 text-sm font-semibold ${theme.accent}`}>18步维度洞察</h3>

          <div className="space-y-3">

            {segment.step_insights.map((item) => (

              <div key={item.step} id={`seg-${segment.id}-step-${item.step}`}>

                <p className="text-xs font-medium text-amber-400/80">

                  第{item.step}步 · {item.title}

                </p>

                <p className={`mt-1 text-sm leading-relaxed ${theme.muted}`}>{item.insight}</p>

              </div>

            ))}

          </div>

        </div>

      )}



      {segment.deep_steps && segment.deep_steps.length > 0 && (

        <div className="space-y-4">

          <h3 className={`text-sm font-semibold ${theme.accent}`}>重点步骤深度复盘（第1/7/12/13步）</h3>

          {segment.deep_steps.map((step) => (

            <StepCard key={step.step} step={step} theme={theme} idPrefix={`seg-${segment.id}-`} />

          ))}

        </div>

      )}

    </div>

  );

}



export function ReportPageView({ data }: { data: ReportPageData }) {

  const theme = getTheme(getDefaultEntityTheme(data.entity.type, data.entity.slug, data.entity.name));

  const disclaimer = getDisclaimer(

    data.entity.type as "city",

    data.entity.subtype,

    data.entity.isVerified,

  );



  const entityType = data.entity.type as EntityType;
  const reportPhases = getReportPhasesForType(entityType);
  const sectionKeys = getReportSectionKeysForType(entityType);
  const personalIp = isPersonalIpReport(entityType);

  let scores: Record<string, number> = {};

  let overall = 0;

  let content: EntityReportContent = { recommendations: [] };



  if (data.report.scoreJson) {

    try {

      const p = JSON.parse(data.report.scoreJson);

      scores = p.scores || {};

      overall = p.overall || 0;

    } catch {

      /* */

    }

  }

  try {

    content = JSON.parse(data.report.contentJson);

  } catch {

    /* */

  }



  const steps = content.steps || [];

  const segments = content.segments || [];

  const has18Steps = steps.length > 0;

  const [activeSegment, setActiveSegment] = useState<string | "main">("main");



  return (
    <div className={`min-h-screen ${theme.card} ${theme.text}`}>
      {/* Hero */}
      <section className="border-b border-black/10 bg-[#11100d] text-[#f8f3e7]">
        <div className="mx-auto grid max-w-5xl gap-8 px-4 py-8 lg:grid-cols-[1.15fr_0.85fr] lg:px-6 lg:py-10">
          <div>
            <Link
              href={entityPath(data.entity.type, data.entity.slug)}
              className="inline-flex items-center gap-1 text-sm text-[#d6c6a6] hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              返回 {data.entity.name} 主页
            </Link>
            <div className="mt-8 inline-flex items-center gap-2 border border-[#e0c16b]/40 px-3 py-1 text-xs tracking-[0.28em] text-[#e0c16b]">
              {personalIp ? "PERSONAL IP · 降龙18掌" : "BRAND REPORT · 降龙十八掌"}
            </div>
            <h1 className="mt-5 text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
              {data.report.title}
            </h1>
            {data.entity.profile?.title && (
              <p className="mt-3 text-lg text-[#d9d0bd]">{data.entity.profile.title}</p>
            )}
            {(() => {
              const summary = sanitizeReportMetaField(data.report.summary, 500);
              return summary ? (
                <p className="mt-4 max-w-2xl text-sm leading-7 text-[#c9bfad]">{summary}</p>
              ) : null;
            })()}
            <p className="mt-3 text-xs text-amber-300/60">{disclaimer}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {has18Steps && (
                <a
                  href="#steps-overview"
                  className="inline-flex items-center gap-2 bg-[#e0c16b] px-5 py-2.5 text-sm font-bold text-[#16130c] hover:bg-[#f1d77f]"
                >
                  查看18步 <ArrowRight className="h-4 w-4" />
                </a>
              )}
              <EntityLikeButton slug={data.entity.slug} initialCount={data.entity.likeCount ?? 0} />
            </div>
          </div>
          <div className="grid content-end gap-4">
            {(() => {
              const heroUrl =
                data.entity.profile?.coverUrl ||
                data.entity.profile?.avatarUrl ||
                data.entity.mediaAssets?.find((m) => m.type !== "video")?.url;
              const gallery = (data.entity.mediaAssets || []).filter(
                (m) => m.url && m.url !== heroUrl && m.type !== "avatar",
              );
              return (
                <>
                  {heroUrl ? (
                    <div className="overflow-hidden rounded-xl border border-white/15">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={resolveAssetUrl(heroUrl)}
                        alt={data.entity.name}
                        className="aspect-[4/3] w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="rounded-xl border border-white/15 bg-white/[0.06] p-5">
                      <div className="flex items-center gap-2 text-sm text-[#d6c6a6]">
                        <BadgeCheck className="h-5 w-5 text-[#e0c16b]" />
                        {data.entity.name}
                      </div>
                      <p className="mt-3 text-sm leading-6 text-[#c9bfad]">
                        AI 联网检索百科、新闻与网页后生成的 18 步品牌复盘报告。
                      </p>
                    </div>
                  )}
                  {gallery.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {gallery.slice(0, 6).map((img) => (
                        <div
                          key={img.id}
                          className="overflow-hidden rounded-lg border border-white/10"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={resolveAssetUrl(img.url)}
                            alt={img.title || data.entity.name}
                            className="aspect-square w-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
            <div className="grid grid-cols-3 gap-3">
              {[
                [has18Steps ? String(steps.length) : "18", "关键步骤"],
                ["4", "复盘阶段"],
                [overall > 0 ? String(overall) : "—", overall > 0 ? "综合评分" : "待评分"],
              ].map(([n, label]) => (
                <div key={label} className="rounded-xl border border-white/15 bg-white/[0.06] p-3 text-center">
                  <div className="text-2xl font-black text-[#e0c16b]">{n}</div>
                  <div className="mt-1 text-[10px] text-[#c9bfad]">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-8 pb-20 lg:px-6">
        {(() => {
          const positioning = sanitizeReportMetaField(content.one_line_positioning, 160);
          return positioning ? (
          <div className={`rounded-xl border ${theme.border} bg-gradient-to-br from-amber-50/80 to-white p-6 shadow-sm`}>
            <div className={`flex items-center gap-2 text-sm font-bold ${theme.accent}`}>
              <BadgeCheck className="h-4 w-4" />
              一句话定位
            </div>
            <p className={`mt-3 text-2xl font-black leading-tight ${theme.accentText}`}>
              {positioning}
            </p>
          </div>
          ) : null;
        })()}



        {(() => {
          const slogan = sanitizeReportMetaField(content.brand_slogan_analysis, 400);
          return slogan ? (
          <div className={`mt-4 rounded-xl border ${theme.border} p-4`}>
            <h2 className={`mb-2 text-sm font-semibold ${theme.accent}`}>品牌口号解读</h2>
            <p className={`whitespace-pre-wrap text-sm leading-relaxed ${theme.muted}`}>
              {slogan}
            </p>
          </div>
          ) : null;
        })()}



        {overall > 0 && (

          <div className={`mt-6 grid gap-4 sm:grid-cols-[1fr_2fr]`}>

            <div className={`rounded-2xl border ${theme.border} p-6 text-center`}>

              <p className="text-sm opacity-60">综合评分</p>

              <p className={`text-5xl font-bold ${theme.scoreAccent}`}>{overall}</p>

              <p className="text-xs opacity-40">满分 10 分</p>

            </div>

            {Object.keys(scores).length > 0 && (

              <div className={`rounded-2xl border ${theme.border} p-4`}>

                <h2 className={`mb-3 text-sm font-semibold ${theme.accent}`}>10维品牌评分</h2>

                <div className="grid gap-2 sm:grid-cols-2">

                  {Object.entries(scores).map(([k, v]) => (

                    <div key={k} className="flex items-center justify-between text-xs">

                      <span className="opacity-70">{k}</span>

                      <span className={`font-bold ${theme.scoreAccent}`}>{v}</span>

                    </div>

                  ))}

                </div>

              </div>

            )}

          </div>

        )}



        {(segments.length > 0 || content.segment_dimensions) && (

          <div className={`mt-6 rounded-2xl border ${theme.border} p-4`}>

            <h2 className={`mb-2 font-semibold ${theme.accent}`}>分城市 / 分行业复盘</h2>

            {content.segment_dimensions && (

              <p className="mb-3 text-xs opacity-60">

                {content.segment_dimensions.cities?.length

                  ? `城市：${content.segment_dimensions.cities.join("、")}`

                  : ""}

                {content.segment_dimensions.industries?.length

                  ? ` · 行业：${content.segment_dimensions.industries.join("、")}`

                  : ""}

              </p>

            )}

            <div className="flex flex-wrap gap-2">

              <button

                type="button"

                onClick={() => setActiveSegment("main")}

                className={`rounded-lg px-3 py-1.5 text-xs ${

                  activeSegment === "main" ? "bg-amber-500/30 font-semibold" : "bg-white/5 hover:bg-white/10"

                }`}

              >

                全景复盘

              </button>

              {segments.map((seg) => (

                <button

                  key={seg.id}

                  type="button"

                  onClick={() => setActiveSegment(seg.id)}

                  className={`rounded-lg px-3 py-1.5 text-xs ${

                    activeSegment === seg.id

                      ? "bg-amber-500/30 font-semibold"

                      : "bg-white/5 hover:bg-white/10"

                  }`}

                >

                  {seg.label}

                </button>

              ))}

            </div>

          </div>

        )}



        {activeSegment !== "main" && segments.length > 0 && (

          <div className="mt-6">

            {segments

              .filter((s) => s.id === activeSegment)

              .map((seg) => (

                <SegmentPanel key={seg.id} segment={seg} theme={theme} />

              ))}

          </div>

        )}



        {activeSegment === "main" && has18Steps && (
          <>
            <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {reportPhases.map((phase, idx) => (
                <div
                  key={phase.id}
                  className={`rounded-xl border ${theme.border} bg-white p-4 shadow-sm`}
                >
                  <div className={`text-sm font-black ${theme.scoreAccent}`}>
                    {String(idx + 1).padStart(2, "0")}
                  </div>
                  <h2 className="mt-2 text-base font-black leading-snug">{phase.title.replace(/^第.+阶段：/, "")}</h2>
                  <p className={`mt-1 text-xs font-bold ${theme.accent}`}>{phase.steps}</p>
                  <p className={`mt-3 text-sm leading-relaxed ${theme.muted}`}>{phase.subtitle}</p>
                </div>
              ))}
            </section>

            <section id="steps-overview" className="mt-10">
              <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className={`flex items-center gap-2 text-sm font-black ${theme.scoreAccent}`}>
                    <BookOpen className="h-4 w-4" />
                    降龙十八掌
                  </div>
                  <h2 className="mt-2 text-2xl font-black">18 步品牌复盘概览</h2>
                </div>
                <p className={`max-w-md text-sm leading-relaxed ${theme.muted}`}>
                  点击卡片跳转到对应步骤的完整方法论拆解（学习目的、理论工具、品牌实践、总结）。
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {steps.map((step) => (
                  <StepOverviewCard key={step.step} step={step} theme={theme} sectionKeys={sectionKeys} />
                ))}
              </div>
            </section>
          </>
        )}

        {activeSegment === "main" && has18Steps && (

          <nav className={`mt-8 rounded-2xl border ${theme.border} p-4`}>

            <h2 className={`mb-3 font-semibold ${theme.accent}`}>18步全景导航</h2>

            {reportPhases.map((phase) => {

              const phaseSteps = steps.filter(

                (s) => s.step >= phase.stepRange[0] && s.step <= phase.stepRange[1],

              );

              if (!phaseSteps.length) return null;

              return (

                <div key={phase.id} className="mb-4 last:mb-0">

                  <p className="text-xs font-medium text-amber-400/80">

                    {phase.title}（{phase.steps}）· {phase.subtitle}

                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">

                    {phaseSteps.map((s) => (

                      <a

                        key={s.step}

                        href={`#step-${s.step}`}

                        className="rounded-lg bg-white/5 px-2.5 py-1 text-xs hover:bg-white/10"

                      >

                        {s.step}. {s.title}

                      </a>

                    ))}

                  </div>

                </div>

              );

            })}

          </nav>

        )}



        {activeSegment === "main" &&
          (has18Steps ? (
            <div id="steps" className="mt-10 space-y-8">
              <h2 className="text-xl font-black">完整 18 步深度复盘</h2>

              {reportPhases.map((phase) => {

                const phaseSteps = steps.filter(

                  (s) => s.step >= phase.stepRange[0] && s.step <= phase.stepRange[1],

                );

                if (!phaseSteps.length) return null;

                return (

                  <div key={phase.id}>

                    <div className="mb-4 border-l-4 border-amber-500 pl-3">

                      <h2 className="text-lg font-bold">{phase.title}</h2>

                      <p className="text-sm opacity-60">{phase.subtitle}</p>

                    </div>

                    <div className="space-y-4">

                      {phaseSteps.map((step) => (

                        <StepCard key={step.step} step={step} theme={theme} sectionKeys={sectionKeys} />

                      ))}

                    </div>

                  </div>

                );

              })}

            </div>

          ) : (

            content.sections?.map((s, i) => (

              <section key={i} className={`mt-4 rounded-2xl border ${theme.border} p-4`}>

                <h2 className={`mb-2 font-semibold ${theme.accent}`}>{s.title}</h2>

                <p className={`text-sm leading-relaxed ${theme.muted}`}>{s.content}</p>

              </section>

            ))

          ))}



        {content.recommendations && content.recommendations.length > 0 && (

          <section className={`mt-6 rounded-2xl border p-4 ${theme.border} bg-white/50`}>

            <h2 className={`mb-3 font-semibold ${theme.scoreAccent}`}>改进建议</h2>

            <ul className="space-y-2">

              {content.recommendations.map((r, i) => (

                <li key={i} className="flex items-start gap-2 text-sm">

                  <ChevronRight className={`mt-0.5 h-4 w-4 shrink-0 ${theme.scoreAccent}`} />

                  {r}

                </li>

              ))}

            </ul>

          </section>

        )}



        {content.training_points && content.training_points.length > 0 && (

          <section className={`mt-4 rounded-2xl border ${theme.border} p-4`}>

            <h2 className={`mb-3 font-semibold ${theme.iconText}`}>案例学习要点</h2>

            <ul className="space-y-2">

              {content.training_points.map((r, i) => (

                <li key={i} className="flex items-start gap-2 text-sm">

                  <span

                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${theme.iconBg} ${theme.iconText}`}

                  >

                    {i + 1}

                  </span>

                  {r}

                </li>

              ))}

            </ul>

          </section>

        )}

      </div>

    </div>

  );

}


