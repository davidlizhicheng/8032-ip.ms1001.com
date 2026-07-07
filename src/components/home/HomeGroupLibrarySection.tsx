import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";
import { GroupLibraryCard } from "@/components/groups/GroupLibraryCard";
import { GROUP_LIBRARY_DESC, GROUP_LIBRARY_TITLE } from "@/lib/config/organization-groups";

type GroupItem = {
  slug: string;
  name: string;
  subtitle?: string | null;
  description?: string | null;
  category: string;
  coverUrl?: string | null;
  memberCount: number;
};

export function HomeGroupLibrarySection({ groups }: { groups: GroupItem[] }) {
  if (groups.length === 0) {
    return (
      <section className="mt-10 rounded-[28px] border border-orange-100 bg-gradient-to-br from-orange-50/80 to-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-orange-600">Group Library</p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">{GROUP_LIBRARY_TITLE}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">{GROUP_LIBRARY_DESC}</p>
          </div>
          <Link
            href="/admin/batch"
            className="rounded-xl bg-gradient-to-r from-fuchsia-600 to-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md"
          >
            协会整体入驻
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-10 rounded-[28px] border border-orange-100 bg-gradient-to-br from-orange-50/80 via-white to-fuchsia-50/40 p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-orange-600">Group Library</p>
          <h2 className="mt-2 flex items-center gap-2 text-2xl font-black text-slate-900">
            <Users className="h-7 w-7 text-orange-500" />
            {GROUP_LIBRARY_TITLE}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">{GROUP_LIBRARY_DESC}</p>
        </div>
        <Link
          href="/library/groups"
          className="inline-flex items-center gap-1 text-sm font-semibold text-orange-700 hover:text-orange-900"
        >
          查看全部分会库
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((g) => (
          <GroupLibraryCard key={g.slug} group={g} />
        ))}
      </div>
    </section>
  );
}
