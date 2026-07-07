import Link from "next/link";
import { Building2, ChevronRight, Users } from "lucide-react";
import { GROUP_CATEGORY_LABELS } from "@/lib/config/organization-groups";

type GroupCard = {
  slug: string;
  name: string;
  subtitle?: string | null;
  description?: string | null;
  category: string;
  coverUrl?: string | null;
  memberCount: number;
};

export function GroupLibraryCard({ group }: { group: GroupCard }) {
  const categoryLabel = GROUP_CATEGORY_LABELS[group.category] || group.category;

  return (
    <Link
      href={`/groups/${group.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-orange-200 hover:shadow-md"
    >
      <div className="relative h-28 bg-gradient-to-br from-orange-100 via-fuchsia-50 to-purple-100">
        {group.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={group.coverUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Users className="h-10 w-10 text-orange-300" />
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-semibold text-orange-700 shadow-sm">
          {categoryLabel}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-bold text-slate-900 group-hover:text-orange-700">{group.name}</h3>
        {group.subtitle && <p className="mt-1 text-sm text-fuchsia-700">{group.subtitle}</p>}
        {group.description && (
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">{group.description}</p>
        )}
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="inline-flex items-center gap-1.5 text-slate-500">
            <Building2 className="h-4 w-4" />
            {group.memberCount} 家会员单位
          </span>
          <span className="inline-flex items-center gap-0.5 font-semibold text-orange-600">
            进入查看
            <ChevronRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}
