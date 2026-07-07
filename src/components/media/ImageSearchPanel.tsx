"use client";

import { useState } from "react";
import { ImageIcon, Loader2, Search, Wand2 } from "lucide-react";
import { resolveAssetUrl } from "@/lib/storage/public-url";

export type ImageSearchResult = {
  url: string;
  title?: string;
  source?: string;
  query?: string;
};

type Props = {
  defaultQuery?: string;
  entityType?: "company" | "brand" | "person" | "city";
  limit?: number;
  onSelect: (url: string, hit: ImageSearchResult) => void;
  selectLabel?: string;
  compact?: boolean;
};

export function ImageSearchPanel({
  defaultQuery = "",
  entityType,
  limit = 12,
  onSelect,
  selectLabel = "选用",
  compact = false,
}: Props) {
  const [query, setQuery] = useState(defaultQuery);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<ImageSearchResult[]>([]);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const q = query.trim();
    if (!q) {
      setError("请输入品牌名或搜索关键词");
      return;
    }
    setLoading(true);
    setError("");
    setSearched(true);
    try {
      const res = await fetch("/api/search/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: q,
          brandName: defaultQuery.trim() || q,
          entityType,
          limit,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "搜索失败");
      setResults(data.images || []);
      if (!data.images?.length) setError("未找到相关图片，可换关键词重试，或直接使用品牌字卡/上传图片");
    } catch (err) {
      setError(err instanceof Error ? err.message : "搜索失败");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function buildFallbackImage() {
    const name = (query.trim() || defaultQuery.trim() || "品牌名片").slice(0, 24);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#fff7ed"/>
          <stop offset="0.52" stop-color="#ffffff"/>
          <stop offset="1" stop-color="#f5d0fe"/>
        </linearGradient>
        <linearGradient id="a" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#ea580c"/>
          <stop offset="1" stop-color="#a21caf"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="800" rx="48" fill="url(#g)"/>
      <circle cx="1040" cy="110" r="180" fill="#fed7aa" opacity=".35"/>
      <circle cx="150" cy="690" r="210" fill="#e9d5ff" opacity=".42"/>
      <rect x="82" y="82" width="1036" height="636" rx="38" fill="rgba(255,255,255,.72)" stroke="#e2e8f0" stroke-width="3"/>
      <text x="120" y="180" font-size="28" fill="#64748b" font-family="Microsoft YaHei, PingFang SC, Arial">GLOBAL BRAND INNOVATION CARD</text>
      <text x="120" y="360" font-size="78" font-weight="800" fill="#111827" font-family="Microsoft YaHei, PingFang SC, Arial">${escapeSvg(name)}</text>
      <rect x="120" y="420" width="420" height="12" rx="6" fill="url(#a)"/>
      <text x="120" y="520" font-size="34" fill="#475569" font-family="Microsoft YaHei, PingFang SC, Arial">暂无联网图片，已生成品牌名片占位图</text>
      <text x="120" y="582" font-size="28" fill="#64748b" font-family="Microsoft YaHei, PingFang SC, Arial">可先设为封面，后续再上传 Logo、门头或前台认证照片</text>
    </svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  function useFallbackImage() {
    const hit = {
      url: buildFallbackImage(),
      title: `${query.trim() || defaultQuery || "品牌"} 占位图`,
      source: "fallback",
      query,
    };
    onSelect(hit.url, hit);
  }

  function retryWith(suffix: string) {
    const base = query.trim() || defaultQuery.trim();
    setQuery(`${base} ${suffix}`.trim());
  }

  return (
    <div className={`rounded-xl border border-slate-200 bg-white ${compact ? "p-3" : "p-4"}`}>
      <p className={`font-medium text-slate-800 ${compact ? "text-xs" : "text-sm"}`}>
        联网搜图
      </p>
      <p className="mt-0.5 text-xs text-slate-500">
        百科配图 + Bing 图搜；点击「{selectLabel}」将图片链接加入相册。搜不到时可使用品牌字卡或手动上传。
      </p>

      <form onSubmit={handleSearch} className="mt-3 flex gap-2">
        <input
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-200"
          placeholder="例如：深圳市品牌学会 Logo、前台、活动"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          搜索
        </button>
      </form>

      {error && <p className="mt-2 text-xs text-amber-600">{error}</p>}

      {results.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {results.map((hit) => (
            <ImageSearchCard
              key={hit.url}
              hit={hit}
              selectLabel={selectLabel}
              onSelect={() => onSelect(hit.url, hit)}
            />
          ))}
        </div>
      )}

      {searched && !loading && results.length === 0 && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="flex items-center gap-2 text-xs font-semibold text-amber-800">
            <ImageIcon className="h-4 w-4" />
            联网搜不到图也可以继续
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            可先用系统生成的品牌字卡作为封面，或者上传本人 Logo、公司前台/门头照片。后续认证建议补 2 张现场背景照片或认证账号截图。
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={useFallbackImage}
              className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
            >
              <Wand2 className="h-3.5 w-3.5" />
              用品牌字卡
            </button>
            {["官网", "Logo", "活动", "前台"].map((suffix) => (
              <button
                key={suffix}
                type="button"
                onClick={() => retryWith(suffix)}
                className="rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs text-amber-800"
              >
                试搜：{suffix}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ImageSearchCard({
  hit,
  onSelect,
  selectLabel,
}: {
  hit: ImageSearchResult;
  onSelect: () => void;
  selectLabel: string;
}) {
  const [broken, setBroken] = useState(false);
  const src = resolveAssetUrl(hit.url);

  if (broken) return null;

  return (
    <div className="group overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={hit.title || "搜索结果"}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={() => setBroken(true)}
        />
        <button
          type="button"
          onClick={onSelect}
          className="absolute inset-x-0 bottom-0 translate-y-full bg-black/70 py-1.5 text-xs font-medium text-white transition group-hover:translate-y-0"
        >
          {selectLabel}
        </button>
      </div>
      <p className="truncate px-1.5 py-1 text-[10px] text-slate-500">
        {hit.source === "baike" ? "百科" : hit.source === "fallback" ? "系统生成" : "Bing"}
        {hit.title ? ` · ${hit.title}` : ""}
      </p>
    </div>
  );
}

function escapeSvg(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
