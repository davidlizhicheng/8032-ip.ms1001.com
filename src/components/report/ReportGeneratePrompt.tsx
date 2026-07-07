import Link from "next/link";
import { ArrowLeft, BookOpen, FileText } from "lucide-react";
import { GenerateReportButton } from "@/components/report/GenerateReportButton";
import { entityPath } from "@/lib/utils/entity-paths";
import { isPersonalIpReport } from "@/lib/ai/report-framework";
import type { EntityType } from "@/lib/schemas/entity";

type EntityLike = {
  name: string;
  slug: string;
  type: string;
  profile?: { title?: string | null; summary?: string | null } | null;
};

export function ReportGeneratePrompt({ entity }: { entity: EntityLike }) {
  const personalIp = isPersonalIpReport(entity.type as EntityType);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-[#1a1208] to-slate-950 text-[#f5f0e6]">
      <div className="mx-auto max-w-lg px-4 py-10">
        <Link
          href={entityPath(entity.type, entity.slug)}
          className="inline-flex items-center gap-2 text-sm text-[#c9bfad] hover:text-[#e0c16b]"
        >
          <ArrowLeft className="h-4 w-4" />
          返回 {entity.name} 档案
        </Link>

        <div className="mt-8 rounded-2xl border border-[#e0c16b]/25 bg-white/[0.04] p-6">
          <p className="text-xs tracking-[0.28em] text-[#e0c16b]">
            {personalIp ? "PERSONAL IP · 降龙18掌" : "BRAND REPORT · 降龙十八掌"}
          </p>
          <h1 className="mt-3 text-2xl font-black">{entity.name}</h1>
          <p className="mt-2 text-sm leading-7 text-[#c9bfad]">
            该档案尚未生成 18 步品牌复盘报告。点击下方按钮，系统将用
            <strong className="text-[#e0c16b]"> 18 个不同提示词 </strong>
            一次性生成全部 18 步文字报告（约 2–5 分钟）。
          </p>

          <div className="mt-6">
            <GenerateReportButton
              slug={entity.slug}
              entityType={entity.type}
              entityName={entity.name}
            />
          </div>

          <Link
            href="/xianglong18"
            className="mt-5 flex items-center justify-center gap-2 text-sm text-[#e0c16b] hover:underline"
          >
            <BookOpen className="h-4 w-4" />
            了解降龙18掌方法论
          </Link>
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-xs leading-6 text-[#a89f8c]">
          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[#e0c16b]" />
          <p>
            生成过程会联网检索百科与公开报道，逐步写入落地方法、专业模型、案例复盘等六段内容。
            若 AI 不可用，将使用手册结构化兜底，保证 18 步内容互不重复。
          </p>
        </div>
      </div>
    </div>
  );
}
