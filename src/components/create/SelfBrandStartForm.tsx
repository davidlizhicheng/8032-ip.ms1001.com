"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, PenLine, Sparkles, User, Building2 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { authFetch, parseJsonResponse } from "@/lib/auth/client";
import {
  PRODUCT_SCENARIO_2,
  PRODUCT_SITE_NAMES,
  PRODUCT_WELCOME_TITLE,
} from "@/lib/config/product-copy";

export function SelfBrandStartForm() {
  const { user, login } = useAuth();
  const [entityType, setEntityType] = useState<"person" | "company">("person");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    entityHref: string;
    cardHref: string;
    reportHref?: string;
    message?: string;
  } | null>(null);

  const [form, setForm] = useState({
    name: "",
    title: "",
    company: "",
    brandSlogan: "",
    bio: "",
    phone: "",
    email: "",
    wechat: "",
    address: "",
    generateReport: true,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      login("login");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await authFetch("/api/self-brand/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, entityType, longBio: form.bio }),
      });
      const data = await parseJsonResponse<{
        entityHref: string;
        cardHref: string;
        reportHref?: string;
        message?: string;
        error?: string;
      }>(res);
      if (!res.ok) throw new Error(data.error || "创建失败");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败");
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-6">
        <h2 className="text-lg font-bold text-green-900">创建成功</h2>
        <p className="mt-2 text-sm leading-7 text-green-800">{result.message}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href={result.entityHref} className="rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white">
            打开品牌档案（可编辑）
          </Link>
          <Link href={result.cardHref} className="rounded-xl border border-green-300 bg-white px-4 py-2 text-sm font-semibold text-green-800">
            预览名片
          </Link>
          {result.reportHref && (
            <Link href={result.reportHref} className="rounded-xl border border-purple-200 bg-white px-4 py-2 text-sm font-semibold text-purple-800">
              查看 18 步报告
            </Link>
          )}
          <Link href="/me" className="rounded-xl border px-4 py-2 text-sm text-slate-700">
            我的品牌页
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-orange-50 p-5">
        <p className="text-xs font-bold text-purple-700">场景 2 · 自助入驻</p>
        <h2 className="mt-1 text-xl font-black text-slate-900">{PRODUCT_WELCOME_TITLE}</h2>
        <p className="mt-2 text-sm text-slate-600">{PRODUCT_SITE_NAMES.join(" · ")}</p>
        <p className="mt-3 text-sm leading-7 text-slate-700">{PRODUCT_SCENARIO_2}</p>
      </section>

      {!user && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          请先{" "}
          <button type="button" onClick={() => login("login")} className="font-semibold underline">
            登录
          </button>
          ，创建后可随时自行修改内容。
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setEntityType("person")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium ${
              entityType === "person" ? "border-purple-400 bg-purple-50 text-purple-800" : "border-slate-200"
            }`}
          >
            <User className="h-4 w-4" /> 个人 / 专家
          </button>
          <button
            type="button"
            onClick={() => setEntityType("company")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium ${
              entityType === "company" ? "border-orange-400 bg-orange-50 text-orange-800" : "border-slate-200"
            }`}
          >
            <Building2 className="h-4 w-4" /> 企业 / 单位
          </button>
        </div>

        <label className="block text-sm font-medium text-slate-700">
          {entityType === "company" ? "企业 / 单位名称" : "您的姓名"} *
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm"
            placeholder={entityType === "company" ? "例如：深圳市某某科技有限公司" : "例如：张三"}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            {entityType === "person" ? "职位 / 头衔" : "行业 / 品类"}
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm"
            />
          </label>
          {entityType === "person" && (
            <label className="block text-sm font-medium text-slate-700">
              所在单位
              <input
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm"
              />
            </label>
          )}
        </div>

        <label className="block text-sm font-medium text-slate-700">
          品牌定位 / 一句话介绍
          <input
            value={form.brandSlogan}
            onChange={(e) => setForm({ ...form, brandSlogan: e.target.value })}
            className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm"
            placeholder="例如：专注企业品牌创新的咨询顾问"
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          <span className="flex items-center gap-1">
            <PenLine className="h-4 w-4" /> 自我介绍 / 企业介绍（请直接粘贴您的内容）*
          </span>
          <textarea
            required
            rows={10}
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm leading-7"
            placeholder="请粘贴或填写您的经历、专长、服务、成就等。无需网上公开报道，生成后可随时自行修改。"
          />
          <span className="mt-1 text-xs text-slate-400">至少 20 字，当前 {form.bio.length} 字</span>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ["phone", "联系电话（选填，便于名片交换）"],
              ["email", "邮箱"],
              ["wechat", "微信"],
              ["address", "地址"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block text-sm font-medium text-slate-700">
              {label}
              <input
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm"
              />
            </label>
          ))}
        </div>

        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.generateReport}
            onChange={(e) => setForm({ ...form, generateReport: e.target.checked })}
            className="mt-1"
          />
          同时生成降龙 18 掌品牌报告（依据您填写的内容，约 2–5 分钟）
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-orange-500 py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? "正在生成，请稍候…" : "根据我的内容生成品牌名片与报告"}
        </button>
      </form>
    </div>
  );
}
