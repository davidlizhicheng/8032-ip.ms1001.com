"use client";

import { AdminSiteBar } from "@/components/admin/AdminSiteBar";
import { AuthProvider } from "@/components/auth/AuthProvider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AdminSiteBar />
      {children}
    </AuthProvider>
  );
}
