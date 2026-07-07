"use client";

import { useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";

type UploadState = { url?: string; error?: string; loading: boolean };

export function UploadProof() {
  const [state, setState] = useState<UploadState>({ loading: false });

  async function onFile(file?: File) {
    if (!file) return;
    setState({ loading: true });
    const form = new FormData();
    form.append("file", file);
    form.append("uploadIndex", "0");
    try {
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "上传失败");
      setState({ loading: false, url: data.url });
    } catch (error) {
      setState({ loading: false, error: error instanceof Error ? error.message : "上传失败" });
    }
  }

  return (
    <div className="mt-5">
      <label className="flex cursor-pointer items-center justify-center gap-3 border border-dashed border-[#e0c16b]/50 bg-white/5 px-5 py-8 text-sm font-bold text-[#f4e8c8] hover:bg-white/10">
        {state.loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
        选择图片测试上传
        <input className="hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => onFile(e.target.files?.[0])} />
      </label>
      {state.error && <p className="mt-3 text-sm text-red-300">{state.error}</p>}
      {state.url && (
        <div className="mt-4 grid gap-3 sm:grid-cols-[140px_1fr]">
          <img src={state.url} alt="上传预览" className="h-32 w-full object-cover" />
          <div className="break-all bg-black/25 p-3 text-xs leading-6 text-[#d8ccb3]">
            上传成功：{state.url}
          </div>
        </div>
      )}
    </div>
  );
}