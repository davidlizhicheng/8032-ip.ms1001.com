"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Lock, LogIn } from "lucide-react";
import { authFetch } from "@/lib/auth/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { EntityPageView } from "@/components/entity/EntityPageView";
import { PublicCardView } from "@/components/card/PublicCardView";

type Props = {
  kind: "entity" | "card";
  slug: string;
  name: string;
  visibility: string;
};

export function PrivatePageGate({ kind, slug, name, visibility }: Props) {
  const { user, login, loading } = useAuth();
  const [data, setData] = useState<unknown>(null);
  const [denied, setDenied] = useState(false);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    setFetching(true);
    const url = kind === "entity" ? `/api/entities/${slug}/view` : `/api/cards/${slug}/view`;
    authFetch(url)
      .then(async (r) => {
        const json = await r.json();
        if (r.ok) setData(json);
        else setDenied(true);
      })
      .finally(() => setFetching(false));
  }, [user, loading, kind, slug]);

  if (visibility === "admin_hidden") {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <p className="text-slate-600">该页面已被管理员下架</p>
        <Link href="/" className="mt-4 text-orange-600 hover:underline">返回首页</Link>
      </div>
    );
  }

  if (loading || fetching) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (data) {
    if (kind === "entity") {
      return <EntityPageView entity={data as Parameters<typeof EntityPageView>[0]["entity"]} />;
    }
    return <PublicCardView card={data as Parameters<typeof PublicCardView>[0]["card"]} />;
  }

  if (denied) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <Lock className="h-10 w-10 text-slate-400" />
        <h1 className="mt-4 text-xl font-bold">{name}</h1>
        <p className="mt-2 text-slate-600">这是私人品牌页，仅创建者本人可见</p>
        <Link href="/" className="mt-6 text-sm text-orange-600 hover:underline">返回首页</Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Lock className="h-10 w-10 text-purple-500" />
      <h1 className="mt-4 text-xl font-bold">{name}</h1>
      <p className="mt-2 max-w-sm text-slate-600">
        这是您的私人品牌页，默认仅自己可见。登录后可预览；在「我的品牌页」可设为公开。
      </p>
      <button
        type="button"
        onClick={() => login("login")}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white"
      >
        <LogIn className="h-4 w-4" /> 登录查看
      </button>
      <Link href="/me" className="mt-3 text-sm text-purple-600 hover:underline">
        我的品牌页
      </Link>
    </div>
  );
}
