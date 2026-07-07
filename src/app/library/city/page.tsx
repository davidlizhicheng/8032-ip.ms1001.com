import { MapPin } from "lucide-react";
import { LibraryListPage } from "@/components/library/LibraryListPage";
import { getPublicEntitiesByType } from "@/lib/services/content-visibility";
import { readOverallScore, rankEntitiesForDisplay } from "@/lib/scoring/entity-score";

export const dynamic = "force-dynamic";

export default async function CityLibraryPage() {
  const cities = rankEntitiesForDisplay(await getPublicEntitiesByType("city", 300));
  return (
    <LibraryListPage
      title="城市品牌库 · 全部公开"
      description="按系统评分排名展示公开城市品牌档案"
      icon={MapPin}
      iconColor="text-sky-600"
      emptyHint="暂无公开城市档案。官方批量生成并公开后，或用户创建并设为公开后，会出现在这里。"
      items={cities.map((e, index) => ({
        id: e.id,
        name: e.name,
        slug: e.slug,
        href: `/city/${e.slug}`,
        subtitle: e.profile?.slogan || e.profile?.summary,
        badge: e.isFeatured ? "官方推荐" : e.isOfficial ? "官方" : undefined,
        score: readOverallScore(e.reports?.[0]?.scoreJson),
        rank: index + 1,
      }))}
    />
  );
}
