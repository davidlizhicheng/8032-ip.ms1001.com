import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AuthBar } from "@/components/auth/AuthBar";
import { SelfBrandStartForm } from "@/components/create/SelfBrandStartForm";

export const metadata = {
  title: "自助入驻 | 全球品牌创新名片网",
  description: "暂无公开报道也可填写自己的内容，生成品牌名片与报告，并随时自行修改",
};

export default function SelfStartPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-orange-50">
      <header className="border-b border-purple-100/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-4">
          <Link href="/" className="text-slate-500 hover:text-slate-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-slate-900">自助入驻 · 填写自己的内容</h1>
            <p className="text-xs text-slate-500">不知名也没关系，生成后可随时修改</p>
          </div>
          <AuthBar />
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-8">
        <SelfBrandStartForm />
      </main>
    </div>
  );
}
