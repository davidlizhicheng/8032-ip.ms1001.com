import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AuthBar } from "@/components/auth/AuthBar";
import { QuickReportForm } from "@/components/report/QuickReportForm";
import {
  PRODUCT_SCENARIO_1,
  PRODUCT_SITE_NAMES,
  PRODUCT_WELCOME_TITLE,
} from "@/lib/config/product-copy";

export const metadata = {
  title: "生成品牌报告 | 降龙18掌",
  description: "输入姓名或单位，AI 生成个人品牌IP降龙18掌复盘报告",
};

type Props = {
  searchParams: Promise<{ name?: string; entityType?: string }>;
};

function parseEntityType(value?: string): "person" | "company" | "city" {
  if (value === "person" || value === "city") return value;
  return "company";
}

export default async function ReportGeneratePage({ searchParams }: Props) {
  const params = await searchParams;
  const initialName = params.name?.trim() || "";
  const initialEntityType = parseEntityType(params.entityType);

  return (
    <div className="min-h-screen bg-gradient-to-br from-fuchsia-50 via-white to-orange-50">
      <header className="border-b border-fuchsia-100/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-4">
          <Link href="/" className="text-slate-500 hover:text-slate-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-slate-900">一键生成品牌报告</h1>
            <p className="text-xs text-slate-500">输入姓名 / 单位 → 降龙18掌复盘</p>
          </div>
          <AuthBar />
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-8">
        <section className="mb-6 rounded-2xl border border-fuchsia-100 bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-slate-900">{PRODUCT_WELCOME_TITLE}</h2>
          <p className="mt-1 text-xs text-slate-500">{PRODUCT_SITE_NAMES.join(" · ")}</p>
          <p className="mt-3 text-sm leading-7 text-slate-600">{PRODUCT_SCENARIO_1}</p>
          <p className="mt-3 text-xs text-slate-500">
            暂无公开报道？请使用{" "}
            <Link href="/start" className="font-semibold text-purple-700 hover:underline">
              自助入驻
            </Link>
            ，直接填写自己的内容生成并可随时修改。
          </p>
        </section>
        <QuickReportForm initialName={initialName} initialEntityType={initialEntityType} />
      </main>
    </div>
  );
}
