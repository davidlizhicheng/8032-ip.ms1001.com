"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";

type Job = {
  id: string;
  jobType: string;
  status: string;
  totalCount: number;
  successCount: number;
  failedCount: number;
  createdAt: string;
};

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/jobs")
      .then((r) => r.json())
      .then(setJobs)
      .finally(() => setLoading(false));
  }, []);

  const statusColor: Record<string, string> = {
    completed: "text-green-600",
    running: "text-blue-600",
    failed: "text-red-600",
    pending: "text-slate-400",
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <Link href="/admin/batch" className="text-slate-400 hover:text-slate-600">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-bold">生成任务列表</h1>
          <Link href="/admin/batch" className="ml-auto text-sm text-orange-600 hover:underline">
            新建任务
          </Link>
          <Link href="/admin/claims" className="text-sm text-purple-600 hover:underline">
            认领审核
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {loading ? (
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
        ) : (
          <div className="overflow-hidden rounded-2xl border bg-white">
            <table className="w-full text-sm">
              <thead className="border-b bg-slate-50 text-left">
                <tr>
                  <th className="px-4 py-3">任务类型</th>
                  <th className="px-4 py-3">状态</th>
                  <th className="px-4 py-3">进度</th>
                  <th className="px-4 py-3">时间</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} className="border-b last:border-0">
                    <td className="px-4 py-3">{job.jobType}</td>
                    <td className={`px-4 py-3 font-medium ${statusColor[job.status] || ""}`}>
                      {job.status}
                    </td>
                    <td className="px-4 py-3">
                      {job.successCount}/{job.totalCount}
                      {job.failedCount > 0 && (
                        <span className="ml-1 text-red-500">({job.failedCount} 失败)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(job.createdAt).toLocaleString("zh-CN")}
                    </td>
                  </tr>
                ))}
                {jobs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                      暂无任务，去{" "}
                      <Link href="/admin/batch" className="text-amber-600">
                        创建批量任务
                      </Link>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
