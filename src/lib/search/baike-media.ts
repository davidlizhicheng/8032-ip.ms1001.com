const USER_AGENT = "Mozilla/5.0 (compatible; BrandNet/1.0; +https://brandnet.local)";

export type BaikeMedia = {
  avatarUrl?: string;
  coverUrl?: string;
  galleryUrls: string[];
  pageVideoUrls: string[];
};

function normalizeImageUrl(raw: string): string | null {
  let url = raw.replace(/&amp;/g, "&").trim();
  if (url.startsWith("//")) url = `https:${url}`;
  if (!url.startsWith("http")) return null;
  if (!/\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url) && !url.includes("bkimg") && !url.includes("bcebos")) {
    return null;
  }
  return url;
}

export function extractMediaFromBaikeHtml(html: string): BaikeMedia {
  const galleryUrls: string[] = [];
  const pageVideoUrls: string[] = [];
  const seen = new Set<string>();

  const pushImg = (raw: string) => {
    const url = normalizeImageUrl(raw);
    if (!url || seen.has(url)) return;
    seen.add(url);
    galleryUrls.push(url);
  };

  const summaryPic =
    html.match(/class="summary-pic"[\s\S]*?<img[^>]+(?:data-src|src)="([^"]+)"/i)?.[1] ||
    html.match(/class="lemma-picture[\s\S]*?(?:data-src|src)="([^"]+)"/i)?.[1];
  if (summaryPic) pushImg(summaryPic);

  for (const m of html.matchAll(/(?:data-src|src)="(https?:[^"]+)"/gi)) {
    pushImg(m[1]);
  }

  for (const m of html.matchAll(/href="(https?:\/\/[^"]*(?:bilibili\.com|youtube\.com|youku\.com|iqiyi\.com)[^"]*)"/gi)) {
    const url = m[1].replace(/&amp;/g, "&");
    if (!pageVideoUrls.includes(url)) pageVideoUrls.push(url);
  }

  return {
    avatarUrl: galleryUrls[0],
    coverUrl: galleryUrls[0],
    galleryUrls: galleryUrls.slice(0, 8),
    pageVideoUrls: pageVideoUrls.slice(0, 4),
  };
}

export async function fetchBaikeMedia(baikeUrl: string): Promise<BaikeMedia | null> {
  try {
    const res = await fetch(baikeUrl, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const html = await res.text();
    return extractMediaFromBaikeHtml(html);
  } catch {
    return null;
  }
}

export async function fetchBaikeMediaForEntries(
  entries: Array<{ url: string }>,
): Promise<BaikeMedia> {
  const merged: BaikeMedia = {
    galleryUrls: [],
    pageVideoUrls: [],
  };
  const seenImg = new Set<string>();

  for (const entry of entries.slice(0, 2)) {
    const media = await fetchBaikeMedia(entry.url);
    if (!media) continue;
    if (!merged.avatarUrl && media.avatarUrl) {
      merged.avatarUrl = media.avatarUrl;
      merged.coverUrl = media.coverUrl;
    }
    for (const url of media.galleryUrls) {
      if (!seenImg.has(url)) {
        seenImg.add(url);
        merged.galleryUrls.push(url);
      }
    }
    for (const url of media.pageVideoUrls) {
      if (!merged.pageVideoUrls.includes(url)) merged.pageVideoUrls.push(url);
    }
  }

  return merged;
}
