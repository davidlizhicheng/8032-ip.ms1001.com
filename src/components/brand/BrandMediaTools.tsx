"use client";

import { useState } from "react";
import { Crown, Loader2, Sparkles, Upload } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { authFetch } from "@/lib/auth/client";
import { ImageUploader } from "@/components/ui/ImageUploader";
import { ImageSearchPanel } from "@/components/media/ImageSearchPanel";
import type { BrandVisualTemplate } from "@/lib/ai/poster-image";

type Props = {
  slug: string;
  kind: "entity" | "card";
  targetId: string;
  themeButtonClass?: string;
  /** 联网搜图默认关键词（品牌名/人物名） */
  searchQuery?: string;
  entityType?: "company" | "brand" | "person" | "city";
  onImageAdded?: (asset: { id: string; url: string; type: string; title?: string | null }) => void;
};

const VISUAL_TEMPLATES: { id: BrandVisualTemplate; label: string }[] = [
  { id: "brand-logo", label: "品牌 Logo" },
  { id: "brand-poster", label: "宣传海报" },
  { id: "ip-creative", label: "IP 形象" },
  { id: "product-poster", label: "产品海报" },
  { id: "social-cover", label: "自媒体封面" },
];

export function BrandMediaTools({
  slug,
  kind,
  targetId,
  themeButtonClass = "bg-orange-500",
  searchQuery,
  entityType,
  onImageAdded,
}: Props) {
  const { user, brandUpgrade, login, openBilling } = useAuth();
  const [msg, setMsg] = useState("");
  const [generating, setGenerating] = useState(false);
  const [template, setTemplate] = useState<BrandVisualTemplate>("brand-poster");

  const mediaBase = kind === "entity" ? `/api/entities/${slug}/media` : `/api/cards/${slug}/media`;
  const visualBase =
    kind === "entity"
      ? `/api/entities/${slug}/generate-brand-visual`
      : `/api/cards/${slug}/generate-ip-image`;

  async function handleError(data: { error?: string; code?: string }) {
    if (data.code === "LOGIN_REQUIRED") {
      setMsg("请先登录");
      login("login");
      return;
    }
    if (data.code === "UPGRADE_REQUIRED") {
      setMsg("需开通品牌升级（¥500）");
      const opts = kind === "entity" ? { entityId: targetId } : { cardId: targetId };
      await openBilling(opts).catch(() => {});
      return;
    }
    setMsg(data.error || "操作失败");
  }

  async function attachImage(url: string) {
    if (!url) return;
    setMsg("保存中…");
    const res = await authFetch(mediaBase, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl: url, type: "gallery" }),
    });
    const data = await res.json();
    if (data.asset) {
      onImageAdded?.(data.asset);
      setMsg("图片已添加");
    } else {
      await handleError(data);
    }
  }

  async function generateVisual() {
    if (!user) {
      login("login");
      return;
    }
    if (!brandUpgrade) {
      setMsg("AI 生图需开通品牌升级（¥500）");
      const opts = kind === "entity" ? { entityId: targetId } : { cardId: targetId };
      await openBilling(opts).catch(() => {});
      return;
    }
    setGenerating(true);
    setMsg(`AI 正在生成${VISUAL_TEMPLATES.find((t) => t.id === template)?.label || "品牌视觉"}…`);
    try {
      const target =
        template === "brand-logo" ? "logo" : template === "ip-creative" ? "cover" : "gallery";
      const res = await authFetch(visualBase, {
        method: "POST",
        body: JSON.stringify({ template, target }),
      });
      const data = await res.json();
      if (data.asset) {
        onImageAdded?.(data.asset);
        setMsg("品牌视觉已生成");
      } else {
        await handleError(data);
      }
    } catch {
      setMsg("生成失败，请稍后重试");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-800">品牌视觉（Poster 制图引擎）</p>
          <p className="mt-0.5 text-xs text-slate-500">Logo / 宣传海报 / IP 形象；需登录并升级（¥500）</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {kind === "entity" && (
            <select
              value={template}
              onChange={(e) => setTemplate(e.target.value as BrandVisualTemplate)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700"
            >
              {VISUAL_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={generateVisual}
            disabled={generating}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-white ${themeButtonClass}`}
          >
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {brandUpgrade ? "生成" : "升级后生图"}
          </button>
        </div>
      </div>

      {!brandUpgrade && (
        <button
          type="button"
          onClick={() =>
            openBilling(kind === "entity" ? { entityId: targetId } : { cardId: targetId })
          }
          className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700"
        >
          <Crown className="h-3.5 w-3.5" />
          品牌升级 ¥500
        </button>
      )}

      <ImageSearchPanel
        defaultQuery={searchQuery || ""}
        entityType={entityType}
        compact
        selectLabel="加入相册"
        onSelect={(url) => attachImage(url)}
      />

      <div>
        <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-700">
          <Upload className="h-4 w-4" />
          上传更多图片
        </p>
        <ImageUploader label="相册图片" aspect="wide" onChange={attachImage} hint="jpg/png/webp" />
      </div>

      {msg && (
        <p
          className={`text-xs ${msg.includes("失败") || msg.includes("需") || msg.includes("登录") ? "text-amber-600" : "text-green-600"}`}
        >
          {msg}
        </p>
      )}
    </div>
  );
}
