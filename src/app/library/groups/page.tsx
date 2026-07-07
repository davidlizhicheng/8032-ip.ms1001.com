import Link from "next/link";
import { Users } from "lucide-react";
import { GroupLibraryCard } from "@/components/groups/GroupLibraryCard";
import { GROUP_LIBRARY_DESC, GROUP_LIBRARY_TITLE } from "@/lib/config/organization-groups";
import { listPublicOrganizationGroups } from "@/lib/services/organization-group";

export const dynamic = "force-dynamic";

export default async function GroupLibraryPage() {
  let groups: Awaited<ReturnType<typeof listPublicOrganizationGroups>> = [];
  try {
    groups = await listPublicOrganizationGroups(100);
  } catch (error) {
    console.warn("[library/groups] unavailable:", error);
  }

  const items = groups.map((g) => ({
    slug: g.slug,
    name: g.name,
    subtitle: g.subtitle,
    description: g.description,
    category: g.category,
    coverUrl: g.coverUrl,
    memberCount: g._count.members,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-purple-50">
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-4">
          <Link href="/" className="text-sm text-slate-500 hover:text-orange-600">
            ← 首页
          </Link>
          <div className="flex-1">
            <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <Users className="h-5 w-5 text-orange-600" />
              {GROUP_LIBRARY_TITLE}
            </h1>
            <p className="text-sm text-slate-500">{GROUP_LIBRARY_DESC}</p>
          </div>
          <span className="text-xs text-slate-400">{items.length} 个团体</span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
            <Users className="mx-auto h-12 w-12 text-orange-200" />
            <p className="mt-4 text-slate-600">暂无团体名片库，欢迎协会、分会整体入驻。</p>
            <Link
              href="/admin/batch"
              className="mt-6 inline-flex rounded-xl bg-gradient-to-r from-fuchsia-600 to-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md"
            >
              批量生成会员档案
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {items.map((g) => (
              <GroupLibraryCard key={g.slug} group={g} />
            ))}
          </div>
        )}

        <section className="mt-12 rounded-2xl border border-fuchsia-100 bg-fuchsia-50/50 p-6 text-sm leading-7 text-slate-600">
          <strong className="text-slate-900">给协会秘书处：</strong>
          输入会员单位与核心人物名单，AI 批量生成品牌研究报告与名片，整体加入本网站「团体案例（名片）库」，为会员提供统一展示平台。
          <Link href="/admin/batch" className="ml-1 font-semibold text-fuchsia-700 hover:text-fuchsia-900">
            进入批量生成 →
          </Link>
        </section>
      </main>
    </div>
  );
}
