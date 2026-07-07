"use client";

import { Crown, Loader2, LogIn, LogOut, Shield, UserRound } from "lucide-react";
import Link from "next/link";
import { useAuth } from "./AuthProvider";

export function AuthBar() {
  const {
    loading,
    user,
    isAdmin,
    brandUpgrade,
    brandUpgradePriceYuan,
    login,
    logout,
    openBilling,
  } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => login("login")}
        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-orange-300 hover:text-orange-600"
      >
        <LogIn className="h-4 w-4" />
        登录
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {isAdmin && (
        <Link
          href="/admin/content"
          className="hidden items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 sm:inline-flex"
        >
          <Shield className="h-3.5 w-3.5" />
          管理
        </Link>
      )}
      {!brandUpgrade && (
        <button
          type="button"
          onClick={() => openBilling()}
          className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-purple-600 to-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-md hover:opacity-95"
        >
          <Crown className="h-4 w-4" />
          品牌升级 ¥{brandUpgradePriceYuan}
        </button>
      )}
      <div className="hidden items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 sm:flex">
        <UserRound className="h-4 w-4 text-slate-400" />
        <span className="max-w-[8rem] truncate">{user.name || user.username}</span>
        {brandUpgrade && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
            已升级
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={logout}
        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white p-2 text-slate-500 hover:text-slate-800"
        title="退出登录"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}
