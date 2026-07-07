import { redirect } from "next/navigation";
import { showcaseReportPath } from "@/lib/config/showcase-report";

/** 旧静态演示页 → 重定向到真实 AI 生成的 18 步报告 */
export default function LegacyMayunDemoRedirect() {
  redirect(showcaseReportPath());
}
