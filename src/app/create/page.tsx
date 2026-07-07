import { CardCreateForm } from "@/components/create/CardCreateForm";
import { AuthBar } from "@/components/auth/AuthBar";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "创建名片 | 个人品牌IP网",
  description: "AI 自动生成你的个人品牌网页名片",
};

export default function CreatePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-purple-50">
      <header className="border-b border-orange-100/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
          <Link href="/" className="text-slate-500 hover:text-slate-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-slate-900">创建 AI 网页名片</h1>
            <p className="text-xs text-slate-500">粘贴资料生成名片，并可同步生成 18 步品牌报告</p>
          </div>
          <AuthBar />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <CardCreateForm />
      </main>
    </div>
  );
}
