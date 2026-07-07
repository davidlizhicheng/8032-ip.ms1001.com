"use client";

import { useMemo, useState } from "react";
import { ImageIcon, Loader2, RefreshCw } from "lucide-react";
import { resolveAssetUrl } from "@/lib/storage/public-url";

export type BrandImageItem = {
  url: string;
  title?: string | null;
  source?: string;
  id?: string;
};

type Props = {
  brandName: string;
  entitySlug: string;
  /** 已入库的相册图 */
  savedImages?: BrandImageItem[];
  /** 服务端预搜到的相关图片 */
  initialDiscovered?: BrandImageItem[];
  themeBorder?: string;
  themeIconText?: string;
  showRefresh?: boolean;
};

function dedupeImages(items: BrandImageItem[]): BrandImageItem[] {
  const seen = new Set<string>();
  const out: BrandImageItem[] = [];
  for (const item of items) {
    if (!item.url || seen.has(item.url)) continue;
    seen.add(item.url);
    out.push(item);
  }
  return out;
}

export function BrandImageGallery({
  brandName,
  entitySlug,
  savedImages = [],
  initialDiscovered = [],
  themeBorder = "border-slate-200",
  themeIconText = "text-orange-500",
  showRefresh = true,
}: Props) {
  const [discovered, setDiscovered] = useState(initialDiscovered);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const displayImages = useMemo(
    () =>
      dedupeImages([
        ...savedImages.filter((m) => m.url),
        ...discovered,
      ]),
    [savedImages, discovered],
  );

  async function refreshSearch() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/entities/${entitySlug}/brand-images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: brandName, limit: 12 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "搜图失败");
      setDiscovered(data.images || []);
      if (!data.images?.length) setError("未找到与品牌名相关的图片");
    } catch (err) {
      setError(err instanceof Error ? err.message : "搜图失败");
    } finally {
      setLoading(false);
    }
  }

  if (!displayImages.length && !loading && !showRefresh) return null;

  return (
    <section className={`rounded-2xl border bg-white p-5 shadow-sm ${themeBorder}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <ImageIcon className={`h-5 w-5 ${themeIconText}`} />
          {brandName} 相关图片
        </h2>
        {showRefresh && (
          <button
            type="button"
            onClick={refreshSearch}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            重新搜图
          </button>
        )}
      </div>

      <p className="mb-4 text-xs text-slate-500">
        根据品牌名称从百科与 Bing 检索，已过滤无关图片
      </p>

      {error && <p className="mb-3 text-xs text-amber-600">{error}</p>}

      {loading && displayImages.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          正在搜索「{brandName}」相关图片…
        </div>
      ) : displayImages.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {displayImages.map((img) => (
            <BrandImageTile key={img.id || img.url} img={img} brandName={brandName} />
          ))}
        </div>
      ) : (
        <p className="py-8 text-center text-sm text-slate-400">暂无相关图片</p>
      )}
    </section>
  );
}

function BrandImageTile({ img, brandName }: { img: BrandImageItem; brandName: string }) {
  const [broken, setBroken] = useState(false);
  if (broken) return null;

  return (
    <figure className="overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolveAssetUrl(img.url)}
        alt={img.title || `${brandName} 相关图片`}
        className="aspect-[4/3] w-full object-cover"
        referrerPolicy="no-referrer"
        loading="lazy"
        onError={() => setBroken(true)}
      />
      {(img.title || img.source) && (
        <figcaption className="truncate px-2 py-1.5 text-[10px] text-slate-500">
          {img.source === "baike" ? "百科" : img.source === "bing" ? "Bing" : ""}
          {img.title ? ` · ${img.title}` : ""}
        </figcaption>
      )}
    </figure>
  );
}
