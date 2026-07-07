"use client";

import { useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { authFetch } from "@/lib/auth/client";
import { resolveAssetUrl } from "@/lib/storage/public-url";
type ImageUploaderProps = {
  label: string;
  value?: string;
  onChange: (url: string) => void;
  aspect?: "square" | "cover" | "wide";
  hint?: string;
  /** ≥1 时走付费上传校验（需登录+品牌升级） */
  uploadIndex?: number;
  /** 若提供则直接上传到实体媒体库（一步完成） */
  entitySlug?: string;
  mediaType?: "gallery" | "cover" | "avatar";
};

const aspectClasses = {
  square: "aspect-square max-w-[120px]",
  cover: "aspect-[16/9] w-full",
  wide: "aspect-[4/3] w-full",
};

export function ImageUploader({
  label,
  value,
  onChange,
  aspect = "square",
  hint,
  uploadIndex = 0,
  entitySlug,
  mediaType = "gallery",
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleUpload(file: File) {
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (entitySlug) {
        formData.append("type", mediaType);
        const res = await authFetch(`/api/entities/${entitySlug}/media`, {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "上传失败");
        const url = data.asset?.url || data.url;
        if (!url) throw new Error("上传成功但未返回图片地址");
        onChange(url);
      } else {
        formData.append("uploadIndex", String(uploadIndex));
        const res = await authFetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "上传失败");
        onChange(data.url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`relative overflow-hidden rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 ${aspectClasses[aspect]} flex items-center justify-center hover:border-amber-400 transition-colors`}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={resolveAssetUrl(value)} alt={label} className="h-full w-full object-cover" />        ) : uploading ? (
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        ) : (
          <div className="flex flex-col items-center gap-1 text-slate-400">
            <Upload className="h-5 w-5" />
            <span className="text-xs">点击上传</span>
          </div>
        )}
      </button>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
        }}
      />
    </div>
  );
}
