"use client";

import Link from "next/link";
import { Shield, Star, Eye, FileCheck, Megaphone, LayoutGrid } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

const links = [
  { href: "/admin/content", label: "内容管理", icon: LayoutGrid },
  { href: "/admin/content#ad-slot", label: "广告位", icon: Megaphone },
  { href: "/admin/review", label: "待审核", icon: FileCheck },
  { href: "/admin/claims", label: "认领审核", icon: Eye },
  { href: "/#brand-ranking", label: "首页榜单", icon: Star },
];

export function AdminSiteBar() {
  const { loading, user, isAdmin } = useAuth();

  if (loading || !user || !isAdmin) return null;

  return (
    <div className="sticky top-0 z-[60] border-b border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-fuchsia-50 px-4 py-2.5 shadow-sm">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 text-sm">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-white">
          <Shield className="h-3.5 w-3.5" />
          管理员工作台
        </span>
        <span className="text-xs text-amber-900/80">
          已登录 {user.name || user.username} · 可在首页直接调序、隐藏、置顶；品牌页可点「编辑页面」
        </span>
        <div className="ml-auto flex flex-wrap gap-1.5">
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-white/90 px-3 py-1 text-xs font-semibold text-amber-950 hover:bg-white"
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
