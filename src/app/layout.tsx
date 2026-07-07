import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Script from "next/script";
import { AppProviders } from "@/components/auth/AppProviders";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

export const metadata: Metadata = {
  title: "全球品牌创新名片网 | 全球品牌创新研究案例库 · 品牌影响力名片榜",
  description:
    "全球品牌创新研究案例库、品牌影响力名片榜；城市/企业/人物品牌档案、认领认证、案例研究与 AI 影响力评分。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={`${geist.variable} h-full`}>
      <body className="min-h-full font-sans antialiased">
        <Script src="/suat_auth_redirect.js?v=1" strategy="beforeInteractive" />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
