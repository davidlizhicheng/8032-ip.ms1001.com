"use client";

import Link from "next/link";
import { Award, Building2, FileText, Layers, MapPin, Moon, Sun, User } from "lucide-react";
import { useState } from "react";
import { BATCH_PRODUCTION_ENABLED, BATCH_PRODUCTION_CLOSED_HINT } from "@/lib/config/batch-production";

const cards = [
  { icon: Award, title: "品牌影响力名片榜", desc: "TOP 排名、AI 评分与名片展示", href: "/#brand-ranking", color: "text-fuchsia-500" },
  { icon: Building2, title: "企业品牌案例", desc: "企业创新、竞品与增长研究", href: "/library/company", color: "text-orange-500" },
  { icon: User, title: "人物 IP 名片", desc: "企业家、专家、创作者品牌", href: "/library/person", color: "text-purple-500" },
  { icon: MapPin, title: "城市品牌案例", desc: "城市定位、产业、招商案例", href: "/library/city", color: "text-sky-500" },
];

export function HomeHeroSwitcher() {
  const [dark, setDark] = useState(false);

  const actionBtn = dark
    ? "inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-bold text-white shadow-lg hover:bg-white/15"
    : "inline-flex items-center gap-2 rounded-xl border border-fuchsia-200 bg-gradient-to-r from-fuchsia-600 to-purple-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-fuchsia-500/20 hover:from-fuchsia-700 hover:to-purple-700";

  const actionBtnAlt = dark
    ? "inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-bold text-white hover:bg-white/15"
    : "inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50";

  const batchDisabled = dark
    ? "inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white/70"
    : "inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-6 py-3 text-sm font-semibold text-slate-500";

  return (
    <section
      className={`relative overflow-hidden rounded-[28px] border px-5 py-14 text-center shadow-sm transition sm:px-8 ${
        dark
          ? "border-red-900 bg-[#8f1717] text-white shadow-red-950/20"
          : "border-orange-100 bg-[radial-gradient(circle_at_12%_12%,#fff4df,transparent_34%),radial-gradient(circle_at_86%_12%,#f4e8ff,transparent_32%),#fffdf9] text-slate-950"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:22px_22px]" />
      <button
        type="button"
        onClick={() => setDark((v) => !v)}
        className={`absolute right-5 top-5 z-10 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
          dark ? "border-white/20 bg-white/10 text-white" : "border-slate-200 bg-white text-slate-700"
        }`}
      >
        {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        {dark ? "浅色版" : "深色版"}
      </button>

      <div className="relative mx-auto max-w-4xl">
        <p className={`text-xs font-bold ${dark ? "text-yellow-100" : "text-orange-600"}`}>
          GLOBAL BRAND INNOVATION CARD NETWORK
        </p>
        <h1 className="mt-4 text-4xl font-black leading-tight tracking-normal sm:text-6xl">
          <span className="block">全球品牌创新名片网</span>
          <span className={dark ? "block text-yellow-100" : "block bg-gradient-to-r from-orange-500 via-rose-500 to-purple-500 bg-clip-text text-transparent"}>
            全球品牌创新案例研究
          </span>
          <span className={dark ? "block text-yellow-100" : "block bg-gradient-to-r from-orange-500 via-rose-500 to-purple-500 bg-clip-text text-transparent"}>
            品牌影响力名片榜
          </span>
        </h1>
        <p className={`mx-auto mt-5 max-w-2xl text-base leading-8 ${dark ? "text-red-50" : "text-slate-600"}`}>
          面向城市、企业、人物 IP 和行业品牌，沉淀公开证据、认证名片、案例研究、18 步品牌复盘与 AI 影响力评分，形成可检索、可交换名片、可排名的品牌影响力榜单。
        </p>
        <div className={`mx-auto mt-6 grid max-w-3xl gap-2 text-left text-xs sm:grid-cols-3 ${dark ? "text-red-50" : "text-slate-600"}`}>
          {[
            ["榜单排名", "管理员可调顺序，未设置时自动排名"],
            ["名片交换", "本人可公开电话、Logo、详细地址"],
            ["身份核验", "前台照片 2 张或认证账号待核验"],
          ].map(([title, desc]) => (
            <div
              key={title}
              className={`rounded-xl border px-4 py-3 ${dark ? "border-white/15 bg-white/10" : "border-orange-100 bg-white/75"}`}
            >
              <p className="font-bold">{title}</p>
              <p className={`mt-1 ${dark ? "text-red-50/80" : "text-slate-500"}`}>{desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/report/generate" className={actionBtn}>
            <Layers className="h-4 w-4" />
            生成案例报告（推荐）
          </Link>
          {BATCH_PRODUCTION_ENABLED ? (
            <Link href="/admin/batch" className={actionBtnAlt}>
              <FileText className="h-4 w-4" />
              批量生成
            </Link>
          ) : (
            <span className={batchDisabled} title={BATCH_PRODUCTION_CLOSED_HINT}>
              <FileText className="h-4 w-4 opacity-60" />
              批量生成
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${dark ? "bg-white/15 text-white/80" : "bg-slate-200 text-slate-600"}`}>
                暂未开通
              </span>
            </span>
          )}
        </div>

        <div className="mx-auto mt-9 grid max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className={`rounded-xl border p-4 text-left transition hover:-translate-y-0.5 ${
                dark ? "border-white/15 bg-white/10 hover:bg-white/15" : "border-slate-200 bg-white/85 hover:bg-white"
              }`}
            >
              <item.icon className={`h-6 w-6 ${item.color}`} />
              <h3 className="mt-3 font-bold">{item.title}</h3>
              <p className={`mt-1 text-xs ${dark ? "text-red-50" : "text-slate-500"}`}>{item.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
