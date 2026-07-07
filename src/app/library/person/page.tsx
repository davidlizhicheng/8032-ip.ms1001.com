import { User } from "lucide-react";
import { LibraryListPage } from "@/components/library/LibraryListPage";
import { getPublicCards, getPublicEntitiesByType } from "@/lib/services/content-visibility";
import { readOverallScore, rankEntitiesForDisplay } from "@/lib/scoring/entity-score";

export const dynamic = "force-dynamic";

export default async function PersonLibraryPage() {
  const [persons, cards] = await Promise.all([
    rankEntitiesForDisplay(await getPublicEntitiesByType("person", 300)),
    getPublicCards(200),
  ]);

  const items = [
    ...persons.map((e, index) => ({
      id: e.id,
      name: e.name,
      slug: e.slug,
      href: `/person/${e.slug}`,
      subtitle: e.profile?.slogan || e.profile?.summary,
      badge: e.isFeatured ? "官方推荐" : e.isOfficial ? "官方" : "人物档案",
      score: readOverallScore(e.reports?.[0]?.scoreJson),
      rank: index + 1,
    })),
    ...cards.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      href: `/u/${c.slug}`,
      subtitle: c.brandSlogan || c.title || c.bio,
      badge: c.isFeatured ? "官方推荐" : "个人名片",
    })),
  ];

  return (
    <LibraryListPage
      title="人物 IP 库 · 全部公开"
      description="人物档案按系统评分排名，个人名片单独展示"
      icon={User}
      iconColor="text-purple-600"
      emptyHint="暂无公开人物内容。用户创建名片后设为「公开可见」即可出现在此。"
      items={items}
    />
  );
}
