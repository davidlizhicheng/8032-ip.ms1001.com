export type NewsItem = {
  title: string;
  url: string;
  source?: string;
  publishedAt?: string;
  excerpt?: string;
};

export async function fetchNewsForEntity(
  name: string,
  type: string,
): Promise<NewsItem[]> {
  const query = encodeURIComponent(`${name} ${type === "city" ? "城市" : type === "company" ? "企业" : ""}`);
  const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=zh-CN&gl=CN&ceid=CN:zh-Hans`;

  try {
    const res = await fetch(rssUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; BrandNet/1.0)" },
      next: { revalidate: 3600 },
    });

    if (!res.ok) return getFallbackNews(name, type);

    const xml = await res.text();
    return parseGoogleNewsRss(xml).slice(0, 8);
  } catch {
    return getFallbackNews(name, type);
  }
}

function parseGoogleNewsRss(xml: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = extractTag(block, "title")?.replace(/<!\[CDATA\[|\]\]>/g, "") || "";
    const link = extractTag(block, "link") || "";
    const pubDate = extractTag(block, "pubDate") || "";
    const source = extractTag(block, "source") || extractSourceFromTitle(title);

    if (title && link) {
      items.push({
        title: cleanTitle(title),
        url: link,
        source,
        publishedAt: pubDate,
        excerpt: title.slice(0, 120),
      });
    }
  }

  return items;
}

function extractTag(block: string, tag: string): string | null {
  const cdata = new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`).exec(block);
  if (cdata) return cdata[1].trim();
  const plain = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(block);
  return plain ? plain[1].trim() : null;
}

function extractSourceFromTitle(title: string): string {
  const parts = title.split(" - ");
  return parts.length > 1 ? parts[parts.length - 1] : "新闻报道";
}

function cleanTitle(title: string): string {
  return title.replace(/ - [^-]+$/, "").trim();
}

function getFallbackNews(_name: string, _type: string): NewsItem[] {
  return [];
}
