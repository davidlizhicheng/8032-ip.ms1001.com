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
  title: "AI城市企业人物品牌网 | 超级品牌IP网",
  description:
    "批量生成城市、企业、人物品牌档案与传播分析报告，支持新闻抓取、认领认证、关系图谱",
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
