import Link from "next/link";
import { Building2, FileText, MapPin, Newspaper, Shield, Sparkles, User } from "lucide-react";
import { AuthBar } from "@/components/auth/AuthBar";
import { HomeRankingSection } from "@/components/home/HomeRankingSection";
import { Xianglong18DetailSections } from "@/components/home/Xianglong18Showcase";
import { HomeHeroSwitcher } from "@/components/home/HomeHeroSwitcher";
import { HomeWelcomeGuide } from "@/components/home/HomeWelcomeGuide";
import { getNewEntityIdsFromBatchJob } from "@/lib/services/entity";
import { getRankedPublicEntitiesByType } from "@/lib/services/content-visibility";
import { rankEntitiesForDisplay } from "@/lib/scoring/entity-score";
import { showcaseReportPath } from "@/lib/config/showcase-report";
import { BATCH_PRODUCTION_ENABLED, BATCH_PRODUCTION_CLOSED_HINT } from "@/lib/config/batch-production";

type Props = {
  searchParams: Promise<{ fromBatch?: string }>;
};

export const dynamic = "force-dynamic";

async function safeRanked(type: "city" | "company" | "person") {
  try {
    return rankEntitiesForDisplay(await getRankedPublicEntitiesByType(type, 200));
  } catch (error) {
    console.warn(`[home] ranked ${type} unavailable:`, error);
    return [];
  }
}

async function safeBatchIds(jobId?: string) {
  if (!jobId) return [];
  try {
    return await getNewEntityIdsFromBatchJob(jobId);
  } catch (error) {
    console.warn("[home] batch highlights unavailable:", error);
    return [];
  }
}

export default async function HomePage({ searchParams }: Props) {
  const params = await searchParams;
  const [cities, companies, persons, highlightIds] = await Promise.all([
    safeRanked("city"),
    safeRanked("company"),
    safeRanked("person"),
    safeBatchIds(params.fromBatch),
  ]);

  const highlights = new Set(highlightIds);
  const batchDone = Boolean(params.fromBatch && highlights.size > 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-purple-50 text-slate-900">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-orange-200/40 blur-3xl" />
        <div className="absolute -right-24 top-1/4 h-80 w-80 rounded-full bg-purple-200/50 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-amber-100/60 blur-3xl" />
      </div>

      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#e0c16b] to-fuchsia-600 text-lg font-bold text-white shadow-md">
            18
          </div>
          <div>
            <span className="font-semibold text-slate-900">全球品牌创新名片网</span>
            <p className="text-xs text-slate-500">全球品牌创新研究案例库 · 品牌影响力名片榜</p>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/xianglong18" className="hidden text-sm font-medium text-fuchsia-600 hover:text-fuchsia-800 sm:block">
            方法论
          </Link>
          {BATCH_PRODUCTION_ENABLED ? (
            <Link href="/admin/batch" className="hidden text-sm text-slate-600 hover:text-orange-600 sm:block">
              批量生成
            </Link>
          ) : (
            <span className="hidden text-sm text-slate-400 sm:block" title={BATCH_PRODUCTION_CLOSED_HINT}>
              批量生成
              <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                暂未开通
              </span>
            </span>
          )}
          <Link href="/me?tab=exchanges" className="hidden text-sm text-slate-600 hover:text-purple-600 sm:block">
            名片夹
          </Link>
          <Link href="/me" className="hidden text-sm text-slate-600 hover:text-purple-600 sm:block">
            我的品牌页
          </Link>
          <Link href="/start" className="hidden text-sm font-semibold text-purple-700 hover:text-purple-900 sm:block">
            自助入驻
          </Link>
          <AuthBar />
          <Link
            href="/start"
            className="hidden rounded-full border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-semibold text-purple-800 sm:inline-flex"
          >
            不知名？自助填写
          </Link>
          <Link
            href="/report/generate"
            className="rounded-full bg-gradient-to-r from-fuchsia-600 to-orange-500 px-5 py-2 text-sm font-semibold text-white shadow-md"
          >
            品牌案例生成
          </Link>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-6 pb-20">
        <HomeHeroSwitcher />

        <HomeWelcomeGuide />

        <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: MapPin, title: "城市品牌库", desc: "城市定位、产业、招商", href: "/library/city", color: "text-sky-600", border: "hover:border-sky-300" },
            { icon: Building2, title: "企业品牌库", desc: "企业档案、竞品分析", href: "/library/company", color: "text-orange-600", border: "hover:border-orange-300" },
            { icon: User, title: "人物IP库", desc: "企业家、专家、达人", href: "/library/person", color: "text-purple-600", border: "hover:border-purple-300" },
            { icon: FileText, title: "品牌影响力名片榜", desc: "AI评分、名片排名", href: showcaseReportPath(), color: "text-fuchsia-600", border: "hover:border-fuchsia-300" },
          ].map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md ${item.border}`}
            >
              <item.icon className={`h-8 w-8 ${item.color}`} />
              <h3 className="mt-3 font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{item.desc}</p>
            </Link>
          ))}
        </section>

        {batchDone && (
          <div className="mt-10 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            批量生成完成，本次新增 <strong>{highlights.size}</strong> 个档案（下方列表已高亮标注“新”）。
          </div>
        )}

        <HomeRankingSection cities={cities} companies={companies} persons={persons} highlightIds={highlights} />

        {/* 案例之后：个人 + 企业 18 步详解 */}
        <Xianglong18DetailSections />

        <section className="mt-16 grid gap-4 sm:grid-cols-3">
          {[
            { icon: Newspaper, title: "联网检索", desc: "百科、Wikidata、新闻与网页正文整理" },
            { icon: Shield, title: "身份确认", desc: "同名人物先确认，确认后再生成" },
            { icon: Sparkles, title: "一次生成 18 步", desc: "18 个独立提示词，2–5 分钟出报告" },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <item.icon className="h-6 w-6 text-fuchsia-500" />
              <h3 className="mt-3 font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{item.desc}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="relative border-t border-slate-200 bg-white/60 py-6 text-center text-sm text-slate-500">
        全球品牌创新名片网 · 全球品牌创新研究案例库 · 品牌影响力名片榜 · ip.ms1001.com
      </footer>
    </div>
  );
}
