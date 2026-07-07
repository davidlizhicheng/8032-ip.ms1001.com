"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowDown, ArrowUp, EyeOff, MapPin, Pin, User, Building2 } from "lucide-react";
import { HomeEntityColumn } from "@/components/home/HomeEntityColumn";
import { useAuth } from "@/components/auth/AuthProvider";
import { authFetch } from "@/lib/auth/client";

type EntityItem = {
  id: string;
  name: string;
  slug: string;
  innovationScore?: number;
  manualRankOrder?: number | null;
  profile?: { slogan?: string | null; summary?: string | null } | null;
};

type ColumnProps = {
  title: string;
  icon: typeof MapPin;
  iconColor: string;
  hrefPrefix: string;
  libraryHref: string;
  entities: EntityItem[];
  highlightIds: Set<string>;
  emptyHint: string;
};

export function HomeRankingSection({
  cities,
  companies,
  persons,
  highlightIds,
}: {
  cities: EntityItem[];
  companies: EntityItem[];
  persons: EntityItem[];
  highlightIds: Set<string>;
}) {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [msg, setMsg] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  async function patchEntity(id: string, patch: Record<string, unknown>) {
    const res = await authFetch("/api/admin/content", {
      method: "PATCH",
      body: JSON.stringify({ kind: "entity", id, ...patch }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "操作失败");
      return;
    }
    setMsg("已保存，正在刷新榜单…");
    router.refresh();
  }

  async function reorderEntities(entities: EntityItem[], fromIndex: number, toIndex: number) {
    const reordered = [...entities];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    const res = await authFetch("/api/admin/content/reorder", {
      method: "POST",
      body: JSON.stringify({ kind: "entity", orderedIds: reordered.map((e) => e.id) }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "排序失败");
      return;
    }
    setMsg("拖动排序已保存");
    router.refresh();
  }

  function itemRank(item: EntityItem, index: number) {
    return typeof item.manualRankOrder === "number" ? item.manualRankOrder : index + 1;
  }

  async function moveEntity(entities: EntityItem[], index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= entities.length) return;
    await reorderEntities(entities, index, targetIndex);
  }

  function adminActions(entities: EntityItem[]) {
    if (!isAdmin) return undefined;
    return {
      onMoveUp: (index: number) => void moveEntity(entities, index, -1),
      onMoveDown: (index: number) => void moveEntity(entities, index, 1),
      onPin: (id: string) => void patchEntity(id, { manualRankOrder: 1, isFeatured: true, visibility: "public" }),
      onHide: (id: string) => void patchEntity(id, { visibility: "admin_hidden" }),
      onReorder: (fromIndex: number, toIndex: number) => void reorderEntities(entities, fromIndex, toIndex),
      dragIndex,
      setDragIndex,
    };
  }

  const columns: ColumnProps[] = [
    {
      title: "城市品牌",
      icon: MapPin,
      iconColor: "text-sky-600",
      hrefPrefix: "/city",
      libraryHref: "/library/city",
      entities: cities,
      highlightIds,
      emptyHint: "暂无公开城市档案。请运行 npm run db:seed:cities 或生成并公开城市品牌",
    },
    {
      title: "企业品牌",
      icon: Building2,
      iconColor: "text-orange-600",
      hrefPrefix: "/company",
      libraryHref: "/library/company",
      entities: companies,
      highlightIds,
      emptyHint: "暂无公开企业档案。请生成案例报告并勾选公开",
    },
    {
      title: "人物 IP",
      icon: User,
      iconColor: "text-purple-600",
      hrefPrefix: "/person",
      libraryHref: "/library/person",
      entities: persons,
      highlightIds,
      emptyHint: "暂无公开人物档案。请生成案例报告并勾选公开",
    },
  ];

  return (
    <section id="brand-ranking" className="mt-14 scroll-mt-8">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Showcase</p>
          <h2 className="text-xl font-bold text-slate-900">全球品牌创新案例研究与品牌影响力名片榜</h2>
          <p className="mt-1 text-xs text-slate-500">
            {isAdmin
              ? "管理员模式：拖动 ⋮⋮ 或 ↑↓ 调序；进入品牌页/报告页可改全部 AI 内容"
              : "管理员排序优先；未设置人工顺序时，按报告综合分自动排名"}
          </p>
          {msg && <p className="mt-2 text-xs font-medium text-green-700">{msg}</p>}
        </div>
        <Link
          href="/report/generate"
          className="hidden rounded-full border border-fuchsia-200 bg-white px-4 py-2 text-xs font-semibold text-fuchsia-700 shadow-sm hover:bg-fuchsia-50 sm:inline-flex"
        >
          生成新案例入榜
        </Link>
      </div>
      {isAdmin && (
        <div className="mb-3 flex flex-wrap gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-950">
          <span className="font-semibold">首页管理：</span>
          <span>拖动 ⋮⋮ 把手排序</span>
          <span>·</span>
          <span>置顶 = 第 1 且官方推荐</span>
          <span>·</span>
          <span>品牌页「编辑页面」可改 AI 档案与 18 步报告 JSON</span>
          <span>·</span>
          <Link href="/admin/content" className="font-semibold underline">
            内容管理（全库拖动）
          </Link>
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-3">
        {columns.map((column) => (
          <HomeEntityColumn
            key={column.title}
            {...column}
            adminActions={adminActions(column.entities)}
          />
        ))}
      </div>
    </section>
  );
}
