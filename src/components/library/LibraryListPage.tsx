import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { LibraryRankingList } from "@/components/library/LibraryRankingList";

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

export function LibraryListPage({
  title,
  description,
  icon: Icon,
  iconColor,
  viewAllHref,
  items,
  emptyHint,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  iconColor: string;
  viewAllHref?: string;
  items: Item[];
  emptyHint: string;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-purple-50">
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-6 py-4">
          <Link href="/" className="text-sm text-slate-500 hover:text-orange-600">
            ← 首页
          </Link>
          <div className="flex-1">
            <h1 className={`flex items-center gap-2 text-xl font-bold text-slate-900`}>
              <Icon className={`h-5 w-5 ${iconColor}`} />
              {title}
            </h1>
            <p className="text-sm text-slate-500">{description}</p>
          </div>
          <span className="text-xs text-slate-400">{items.length} 个公开</span>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-8">
        {items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center text-slate-500">
            {emptyHint}
          </p>
        ) : (
          <LibraryRankingList items={items} />
        )}
      </main>
    </div>
  );
}
