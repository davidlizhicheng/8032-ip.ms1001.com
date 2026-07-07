import { Building2 } from "lucide-react";
import { LibraryListPage } from "@/components/library/LibraryListPage";
import { getPublicEntitiesByType } from "@/lib/services/content-visibility";
import { readOverallScore, rankEntitiesForDisplay } from "@/lib/scoring/entity-score";

export const dynamic = "force-dynamic";

export default async function CompanyLibraryPage() {
  const companies = rankEntitiesForDisplay(await getPublicEntitiesByType("company", 300));
  return (
    <LibraryListPage
      title="企业品牌库 · 全部公开"
      description="按系统评分排名展示公开企业品牌档案"
      icon={Building2}
      iconColor="text-orange-600"
      emptyHint="暂无公开企业档案。"
      items={companies.map((e, index) => ({
        id: e.id,
        name: e.name,
        slug: e.slug,
        href: `/company/${e.slug}`,
        subtitle: e.profile?.slogan || e.profile?.summary,
        badge: e.isFeatured ? "官方推荐" : e.isOfficial ? "官方" : undefined,
        score: readOverallScore(e.reports?.[0]?.scoreJson),
        rank: index + 1,
      }))}
    />
  );
}
