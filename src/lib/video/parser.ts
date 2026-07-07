import { VideoPreviewSchema, type VideoPreview } from "@/lib/schemas/card";

type PlatformRule = {
  name: string;
  test: RegExp;
  canEmbed: boolean;
  getEmbedUrl?: (url: string) => string | null;
  getCoverUrl?: (url: string) => string;
};

const PLATFORMS: PlatformRule[] = [
  {
    name: "youtube",
    test: /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/,
    canEmbed: true,
    getEmbedUrl: (url) => {
      const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
      return match ? `https://www.youtube.com/embed/${match[1]}` : null;
    },
    getCoverUrl: (url) => {
      const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
      return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : "";
    },
  },
  {
    name: "bilibili",
    test: /bilibili\.com\/video\/(BV[\w]+|av\d+)/,
    canEmbed: true,
    getEmbedUrl: (url) => {
      const bv = url.match(/BV[\w]+/)?.[0];
      const av = url.match(/av(\d+)/)?.[1];
      if (bv) return `https://player.bilibili.com/player.html?bvid=${bv}&page=1&high_quality=1`;
      if (av) return `https://player.bilibili.com/player.html?aid=${av}&page=1&high_quality=1`;
      return null;
    },
  },
  {
    name: "tencent",
    test: /v\.qq\.com\/x\/cover\//,
    canEmbed: false,
  },
  {
    name: "youku",
    test: /youku\.com\/v_/,
    canEmbed: false,
  },
  {
    name: "douyin",
    test: /douyin\.com|v\.douyin\.com/,
    canEmbed: false,
  },
  {
    name: "xiaohongshu",
    test: /xiaohongshu\.com|xhslink\.com/,
    canEmbed: false,
  },
  {
    name: "weixin_channels",
    test: /channels\.weixin\.qq\.com/,
    canEmbed: false,
  },
  {
    name: "bilibili_search",
    test: /search\.bilibili\.com\/all\?/,
    canEmbed: false,
  },
  {
    name: "baidu_video_search",
    test: /baidu\.com\/s\?.*(?:tn=baiduvideo|word=)/,
    canEmbed: false,
  },
];

const PLATFORM_LABELS: Record<string, string> = {
  youtube: "YouTube",
  bilibili: "哔哩哔哩",
  tencent: "腾讯视频",
  youku: "优酷",
  douyin: "抖音",
  xiaohongshu: "小红书",
  weixin_channels: "视频号",
  bilibili_search: "B站视频检索",
  baidu_video_search: "全网视频检索",
  unknown: "视频",
};

export function parseVideoUrl(url: string): VideoPreview {
  const trimmed = url.trim();

  for (const platform of PLATFORMS) {
    if (platform.test.test(trimmed)) {
      const embedUrl = platform.getEmbedUrl?.(trimmed) || "";
      const coverUrl = platform.getCoverUrl?.(trimmed) || "";
      const canEmbed = platform.canEmbed && !!embedUrl;

      return VideoPreviewSchema.parse({
        platform: platform.name,
        url: trimmed,
        title: `${PLATFORM_LABELS[platform.name] || "视频"}内容`,
        cover_url: coverUrl,
        embed_url: embedUrl,
        can_embed: canEmbed,
      });
    }
  }

  return VideoPreviewSchema.parse({
    platform: "unknown",
    url: trimmed,
    title: "视频内容",
    cover_url: "",
    embed_url: "",
    can_embed: false,
  });
}

export function getPlatformLabel(platform: string): string {
  return PLATFORM_LABELS[platform] || "视频";
}
