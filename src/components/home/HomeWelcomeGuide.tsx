"use client";

import Link from "next/link";
import { Building2, LogIn, PenLine, Sparkles, Users } from "lucide-react";
import {
  PRODUCT_CTA,
  PRODUCT_SCENARIOS,
  PRODUCT_SITE_NAMES,
  PRODUCT_URL,
  PRODUCT_WELCOME_TITLE,
} from "@/lib/config/product-copy";

const ICONS = {
  "1": Building2,
  "2": PenLine,
  "3": Users,
} as const;

export function HomeWelcomeGuide() {
  return (
    <section className="mt-10 rounded-[28px] border border-orange-100 bg-white/90 p-6 shadow-sm sm:p-8">
      <p className="text-xs font-bold uppercase tracking-widest text-orange-600">Welcome</p>
      <h2 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">{PRODUCT_WELCOME_TITLE}</h2>
      <p className="mt-3 text-sm text-slate-600">
        欢迎登录{" "}
        <span className="font-semibold text-slate-900">{PRODUCT_SITE_NAMES.join(" · ")}</span>
      </p>
      <p className="mt-1 text-xs text-slate-400">
        <a href={PRODUCT_URL} className="hover:text-orange-600">
          {PRODUCT_URL}
        </a>
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {PRODUCT_SCENARIOS.map((item) => {
          const Icon = ICONS[item.key];
          return (
            <article
              key={item.key}
              className={`rounded-2xl border p-5 ${
                "highlight" in item && item.highlight
                  ? "border-purple-200 bg-gradient-to-br from-purple-50 to-white ring-1 ring-purple-100"
                  : "border-slate-100 bg-gradient-to-br from-slate-50 to-white"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-sm font-bold text-orange-700">
                  {item.key}
                </span>
                <Icon className="h-5 w-5 text-fuchsia-600" />
                <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-600">{item.desc}</p>
              <Link
                href={item.href}
                className="mt-4 inline-flex text-sm font-semibold text-fuchsia-700 hover:text-fuchsia-900"
              >
                {item.cta} →
              </Link>
            </article>
          );
        })}
      </div>

      <p className="mt-6 rounded-2xl border border-fuchsia-100 bg-fuchsia-50/60 px-5 py-4 text-sm leading-7 text-slate-700">
        {PRODUCT_CTA}
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href="/start"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md"
        >
          <PenLine className="h-4 w-4" />
          自助入驻（不知名也可）
        </Link>
        <Link
          href="/report/generate"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md"
        >
          <Sparkles className="h-4 w-4" />
          品牌案例生成（有公开报道）
        </Link>
        <Link
          href="/me"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:border-orange-300"
        >
          <LogIn className="h-4 w-4" />
          欢迎登录
        </Link>
      </div>
    </section>
  );
}
