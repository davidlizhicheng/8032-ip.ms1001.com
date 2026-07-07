"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowDown, ArrowUp, EyeOff, GripVertical, Pin } from "lucide-react";

type EntityItem = {
  id: string;
  name: string;
  slug: string;
  innovationScore?: number;
  manualRankOrder?: number | null;
  profile?: { slogan?: string | null; summary?: string | null } | null;
};

type AdminActions = {
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onPin: (id: string) => void;
  onHide: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  dragIndex: number | null;
  setDragIndex: (index: number | null) => void;
};

export function HomeEntityColumn({
  title,
  icon: Icon,
  iconColor,
  hrefPrefix,
  libraryHref,
  entities,
  highlightIds,
  emptyHint,
  adminActions,
}: {
  title: string;
  icon: LucideIcon;
  iconColor: string;
  hrefPrefix: string;
  libraryHref?: string;
  entities: EntityItem[];
  highlightIds: Set<string>;
  emptyHint: string;
  adminActions?: AdminActions;
}) {
  const rankStyles = [
    "bg-amber-400 text-amber-950 shadow-amber-200",
    "bg-slate-300 text-slate-900 shadow-slate-200",
    "bg-orange-300 text-orange-950 shadow-orange-200",
  ];

  return (
    <div className="flex min-h-[420px] flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <Icon className={`h-4 w-4 ${iconColor}`} />
          {title}
        </h2>
        <div className="flex items-center gap-2">
          {adminActions && (
            <span className="text-[10px] font-semibold text-amber-700">拖动 ⋮⋮ 排序</span>
          )}
          <span className="text-xs text-slate-400">{entities.length} 入榜</span>
          {libraryHref && (
            <Link href={libraryHref} className="text-xs font-medium text-orange-600 hover:underline">
              查看全部 →
            </Link>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {entities.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-slate-400">{emptyHint}</p>
        ) : (
          <ul className="space-y-2">
            {entities.map((e, index) => {
              const isNew = highlightIds.has(e.id);
              const isDragging = adminActions?.dragIndex === index;
              return (
                <li
                  key={e.id}
                  draggable={Boolean(adminActions)}
                  onDragStart={() => adminActions?.setDragIndex(index)}
                  onDragEnd={() => adminActions?.setDragIndex(null)}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (adminActions?.dragIndex != null && adminActions.dragIndex !== index) {
                      adminActions.onReorder(adminActions.dragIndex, index);
                    }
                    adminActions?.setDragIndex(null);
                  }}
                  className={`space-y-1 rounded-xl transition ${
                    isDragging ? "opacity-50 ring-2 ring-amber-400" : ""
                  }`}
                >
                  <div className="flex items-stretch gap-1">
                    {adminActions && (
                      <button
                        type="button"
                        className="flex shrink-0 cursor-grab items-center rounded-lg border border-amber-200 bg-amber-50 px-1.5 text-amber-800 active:cursor-grabbing"
                        title="拖动排序"
                        onMouseDown={(event) => event.stopPropagation()}
                      >
                        <GripVertical className="h-4 w-4" />
                      </button>
                    )}
                    <Link
                      href={`${hrefPrefix}/${e.slug}`}
                      className={`block min-w-0 flex-1 rounded-xl border px-3 py-2.5 transition hover:shadow-sm ${
                        isNew
                          ? "border-orange-300 bg-orange-50 ring-1 ring-orange-200"
                          : "border-slate-100 bg-slate-50/50 hover:border-slate-200 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex h-7 shrink-0 items-center justify-center rounded-full px-2 text-[10px] font-black shadow-sm ${
                            rankStyles[index] || "bg-slate-900 text-white shadow-slate-200"
                          }`}
                          title={`第 ${index + 1} 名`}
                        >
                          {index < 3 ? `TOP${index + 1}` : index + 1}
                        </span>
                        <p className="font-medium text-slate-900">{e.name}</p>
                        {isNew && (
                          <span className="rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                            新
                          </span>
                        )}
                        {typeof e.innovationScore === "number" && (
                          <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                            AI {e.innovationScore}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
                        {e.profile?.slogan || e.profile?.summary || "—"}
                      </p>
                    </Link>
                  </div>
                  {adminActions && (
                    <div className="flex flex-wrap gap-1 px-1">
                      <button
                        type="button"
                        onClick={() => adminActions.onMoveUp(index)}
                        disabled={index === 0}
                        className="inline-flex items-center gap-0.5 rounded border border-amber-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-amber-900 disabled:opacity-40"
                      >
                        <ArrowUp className="h-3 w-3" /> 上移
                      </button>
                      <button
                        type="button"
                        onClick={() => adminActions.onMoveDown(index)}
                        disabled={index >= entities.length - 1}
                        className="inline-flex items-center gap-0.5 rounded border border-amber-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-amber-900 disabled:opacity-40"
                      >
                        <ArrowDown className="h-3 w-3" /> 下移
                      </button>
                      <button
                        type="button"
                        onClick={() => adminActions.onPin(e.id)}
                        className="inline-flex items-center gap-0.5 rounded border border-amber-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-amber-900"
                      >
                        <Pin className="h-3 w-3" /> 置顶
                      </button>
                      <button
                        type="button"
                        onClick={() => adminActions.onHide(e.id)}
                        className="inline-flex items-center gap-0.5 rounded border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700"
                      >
                        <EyeOff className="h-3 w-3" /> 隐藏
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
