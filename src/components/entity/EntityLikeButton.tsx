"use client";

import { useCallback, useEffect, useState } from "react";
import { Heart, Loader2 } from "lucide-react";

function getVisitorKey(): string {
  if (typeof window === "undefined") return "";
  const key = "brandnet_visitor_key";
  let id = localStorage.getItem(key);
  if (!id) {
    id = `v_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
    localStorage.setItem(key, id);
  }
  return id;
}

type Props = {
  slug: string;
  initialCount?: number;
  className?: string;
};

export function EntityLikeButton({ slug, initialCount = 0, className = "" }: Props) {
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const visitorKey = getVisitorKey();
    const q = visitorKey ? `?visitorKey=${encodeURIComponent(visitorKey)}` : "";
    fetch(`/api/entities/${slug}/like${q}`)
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.likeCount === "number") setCount(d.likeCount);
        if (typeof d.liked === "boolean") setLiked(d.liked);
      })
      .catch(() => {});
  }, [slug]);

  const toggle = useCallback(async () => {
    const visitorKey = getVisitorKey();
    if (!visitorKey || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/entities/${slug}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitorKey,
          action: liked ? "unlike" : "like",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCount(data.likeCount ?? count);
        setLiked(Boolean(data.liked));
      }
    } finally {
      setLoading(false);
    }
  }, [slug, liked, loading, count]);

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm transition hover:bg-white/20 ${className}`}
      aria-pressed={liked}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Heart className={`h-4 w-4 ${liked ? "fill-red-400 text-red-400" : ""}`} />
      )}
      <span>{count}</span>
    </button>
  );
}
