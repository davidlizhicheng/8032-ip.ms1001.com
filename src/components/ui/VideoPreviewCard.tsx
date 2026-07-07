"use client";

import { ExternalLink, Play } from "lucide-react";
import { getPlatformLabel } from "@/lib/video/parser";
import { resolveAssetUrl } from "@/lib/storage/public-url";

type VideoPreviewCardProps = {
  platform: string;
  url: string;
  title: string;
  coverUrl?: string | null;
  embedUrl?: string | null;
  canEmbed?: boolean;
  compact?: boolean;
};

export function VideoPreviewCard({
  platform,
  url,
  title,
  coverUrl,
  embedUrl,
  canEmbed,
  compact,
}: VideoPreviewCardProps) {
  if (canEmbed && embedUrl && !compact) {
    return (
      <div className="overflow-hidden rounded-xl border border-white/10">
        <iframe
          src={embedUrl}
          title={title}
          className="aspect-video w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
        <div className="flex items-center justify-between bg-black/40 px-3 py-2 text-sm">
          <span>{title}</span>
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-amber-400">
            原链接
          </a>
        </div>
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block overflow-hidden rounded-xl border border-white/10 bg-black/20"
    >
      <div className="relative aspect-video bg-gradient-to-br from-zinc-800 to-zinc-900">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={resolveAssetUrl(coverUrl)} alt={title} className="h-full w-full object-cover opacity-80" />
        ) : null}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/30">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur">
            <Play className="h-5 w-5 fill-white text-white" />
          </div>
          <span className="text-sm text-white/90">点击观看</span>
        </div>
      </div>
      <div className="flex items-center justify-between px-3 py-2.5 text-sm">
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-xs opacity-60">{getPlatformLabel(platform)}</p>
        </div>
        <ExternalLink className="h-4 w-4 opacity-50 group-hover:opacity-100" />
      </div>
    </a>
  );
}
