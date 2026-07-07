"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GripVertical } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { authFetch } from "@/lib/auth/client";

type Item = {
  id: string;
  name: string;
  slug: string;
  href: string;
  subtitle?: string | null;
  badge?: string;
  score?: number | null;
  rank?: number;
};

export function LibraryRankingList({ items: initialItems }: { items: Item[] }) {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [items, setItems] = useState(initialItems);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [msg, setMsg] = useState("");

  async function reorder(fromIndex: number, toIndex: number) {
    const reordered = [...items];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    setItems(reordered.map((item, index) => ({ ...item, rank: index + 1 })));

    const res = await authFetch("/api/admin/content/reorder", {
      method: "POST",
      body: JSON.stringify({ kind: "entity", orderedIds: reordered.map((e) => e.id) }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "排序失败");
      setItems(initialItems);
      return;
    }
    setMsg("拖动排序已保存");
    router.refresh();
  }

  if (items.length === 0) return null;

  return (
    <>
      {isAdmin && (
        <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-950">
          管理员：拖动左侧 ⋮⋮ 调整公开榜顺序。{msg && <span className="ml-2 text-green-700">{msg}</span>}
        </p>
      )}
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((item, index) => (
          <li
            key={item.id}
            draggable={isAdmin}
            onDragStart={() => isAdmin && setDragIndex(index)}
            onDragEnd={() => setDragIndex(null)}
            onDragOver={(event) => {
              if (!isAdmin) return;
              event.preventDefault();
            }}
            onDrop={(event) => {
              event.preventDefault();
              if (isAdmin && dragIndex != null && dragIndex !== index) {
                void reorder(dragIndex, index);
              }
              setDragIndex(null);
            }}
            className={`${dragIndex === index ? "opacity-50 ring-2 ring-amber-400 rounded-2xl" : ""}`}
          >
            <div className="flex items-stretch gap-1">
              {isAdmin && (
                <span
                  className="flex shrink-0 cursor-grab items-center rounded-lg border border-amber-200 bg-amber-50 px-1.5 text-amber-800"
                  title="拖动排序"
                >
                  <GripVertical className="h-4 w-4" />
                </span>
              )}
              <Link
                href={item.href}
                className="block min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-orange-200 hover:shadow-md"
              >
                <div className="flex items-center gap-2">
                  {typeof item.rank === "number" && (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-black text-white">
                      {item.rank}
                    </span>
                  )}
                  <p className="font-semibold text-slate-900">{item.name}</p>
                  {item.badge && (
                    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
                      {item.badge}
                    </span>
                  )}
                  {typeof item.score === "number" && (
                    <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                      评分 {item.score}
                    </span>
                  )}
                </div>
                {item.subtitle && (
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">{item.subtitle}</p>
                )}
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
