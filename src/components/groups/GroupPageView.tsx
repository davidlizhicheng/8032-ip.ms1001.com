import Link from "next/link";
import { Building2, MapPin, User } from "lucide-react";
import { entityPath } from "@/lib/utils/entity-paths";
import { readOverallScore } from "@/lib/scoring/entity-score";
import { GROUP_CATEGORY_LABELS } from "@/lib/config/organization-groups";

type MemberEntity = {
  id: string;
  type: string;
  name: string;
  slug: string;
  profile?: {
    subtitle?: string | null;
    slogan?: string | null;
    summary?: string | null;
    avatarUrl?: string | null;
  } | null;
  reports?: Array<{ scoreJson?: string | null }>;
};

type GroupMember = {
  memberRole?: string | null;
  entity: MemberEntity;
};

type GroupData = {
  slug: string;
  name: string;
  shortName?: string | null;
  subtitle?: string | null;
  description?: string | null;
  category: string;
  coverUrl?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  members: GroupMember[];
  hostEntity?: {
    slug: string;
    type: string;
    name: string;
  } | null;
};

const TYPE_LABELS: Record<string, string> = {
  company: "企业",
  person: "人物",
  brand: "品牌",
};

const TYPE_ICONS = {
  company: Building2,
  person: User,
  brand: Building2,
};

export function GroupPageView({ group }: { group: GroupData }) {
  const categoryLabel = GROUP_CATEGORY_LABELS[group.category] || group.category;
  const companies = group.members.filter((m) => m.entity.type === "company" || m.entity.type === "brand");
  const persons = group.members.filter((m) => m.entity.type === "person");

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-purple-50">
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-5xl px-6 py-4">
          <Link href="/library/groups" className="text-sm text-slate-500 hover:text-orange-600">
            ← 团体案例（名片）库
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-orange-100 bg-gradient-to-br from-orange-50 via-white to-fuchsia-50">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">
            {categoryLabel}
          </span>
          <h1 className="mt-4 text-3xl font-black text-slate-900 sm:text-4xl">{group.name}</h1>
          {group.subtitle && <p className="mt-2 text-lg text-fuchsia-700">{group.subtitle}</p>}
          {group.description && (
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">{group.description}</p>
          )}
          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-slate-500">
            <span>{group.members.length} 个公开档案</span>
            {group.hostEntity && (
              <Link
                href={entityPath(group.hostEntity.type, group.hostEntity.slug)}
                className="font-medium text-orange-600 hover:text-orange-800"
              >
                查看协会档案 →
              </Link>
            )}
            {(group.contactPhone || group.contactEmail) && (
              <span className="text-slate-400">
                联系入驻
                {group.contactPhone && ` · ${group.contactPhone}`}
                {group.contactEmail && ` · ${group.contactEmail}`}
              </span>
            )}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-5xl px-6 py-10">
        {companies.length > 0 && (
          <section className="mb-12">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <Building2 className="h-5 w-5 text-orange-600" />
              会员单位 · 企业品牌
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {companies.map((m) => (
                <MemberCard key={m.entity.id} member={m} />
              ))}
            </div>
          </section>
        )}

        {persons.length > 0 && (
          <section className="mb-12">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <User className="h-5 w-5 text-purple-600" />
              核心人物 · 个人品牌
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {persons.map((m) => (
                <MemberCard key={m.entity.id} member={m} />
              ))}
            </div>
          </section>
        )}

        {group.members.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center text-slate-500">
            该团体名片库暂无公开会员单位，欢迎协会整体入驻后批量生成会员档案。
          </div>
        )}

        <section className="mt-12 rounded-2xl border border-fuchsia-100 bg-gradient-to-br from-fuchsia-50 to-orange-50 p-6 sm:p-8">
          <h3 className="text-lg font-bold text-slate-900">协会 / 分会整体入驻</h3>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            为会员单位提供统一展示平台：批量生成企业品牌档案与个人品牌名片，集中展示各家企业情况，增进会员互相了解。
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/admin/batch"
              className="rounded-xl bg-gradient-to-r from-fuchsia-600 to-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md"
            >
              批量生成会员档案
            </Link>
            <Link
              href="/library/groups"
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:border-orange-200"
            >
              浏览更多团体库
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

function MemberCard({ member }: { member: GroupMember }) {
  const { entity, memberRole } = member;
  const Icon = TYPE_ICONS[entity.type as keyof typeof TYPE_ICONS] || MapPin;
  const href = entityPath(entity.type, entity.slug);
  const subtitle = entity.profile?.slogan || entity.profile?.subtitle || entity.profile?.summary;
  const score = readOverallScore(entity.reports?.[0]?.scoreJson);

  return (
    <Link
      href={href}
      className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-orange-200 hover:shadow-md"
    >
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-orange-100 to-fuchsia-100">
        {entity.profile?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={entity.profile.avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <Icon className="h-6 w-6 text-orange-500" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-slate-900">{entity.name}</h3>
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
            {TYPE_LABELS[entity.type] || entity.type}
          </span>
          {memberRole && (
            <span className="rounded bg-orange-50 px-1.5 py-0.5 text-[10px] font-medium text-orange-700">
              {memberRole}
            </span>
          )}
        </div>
        {subtitle && <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{subtitle}</p>}
        {typeof score === "number" && (
          <p className="mt-2 text-xs font-medium text-fuchsia-600">品牌影响力 {score.toFixed(1)}</p>
        )}
      </div>
    </Link>
  );
}
