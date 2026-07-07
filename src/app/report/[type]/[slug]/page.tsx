import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getEntityBySlug } from "@/lib/services/entity";
import { ReportPageView } from "@/components/entity/ReportPageView";
import { ReportGeneratePrompt } from "@/components/report/ReportGeneratePrompt";

type Props = { params: Promise<{ type: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const entity = await getEntityBySlug(slug);
  if (!entity) return { title: "报告未找到" };
  const report = entity.reports[0];
  return { title: report?.title || `${entity.name} · 生成品牌报告` };
}

export default async function ReportPage({ params }: Props) {
  const { type, slug } = await params;
  const entity = await getEntityBySlug(slug);
  if (!entity || entity.type !== type) notFound();

  const report = entity.reports[0];
  if (!report) {
    return <ReportGeneratePrompt entity={entity} />;
  }

  return <ReportPageView data={{ entity, report }} />;
}
