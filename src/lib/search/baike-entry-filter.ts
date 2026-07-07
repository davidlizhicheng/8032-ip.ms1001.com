import { decodeHtmlEntities } from "@/lib/content/decode-html";
import { cleanEncyclopediaText } from "@/lib/content/source-clean";
import type { EnrichedSource } from "@/lib/search/baike-fetcher";
import { expandPersonSearchNames, getBlockedBaikeUrls } from "@/lib/search/person-name-aliases";

/** 明显不是人物词条的百科（如《XX传》图书、单位、游戏等） */
export function isWrongPersonBaikeEntry(entry: EnrichedSource, name: string): boolean {
  const title = decodeHtmlEntities(entry.title.replace(/ - 百度百科$/, ""));
  const searchNames = expandPersonSearchNames(name);
  const urlBase = entry.url.split("?")[0];

  for (const blocked of getBlockedBaikeUrls(name)) {
    if (urlBase === blocked.split("?")[0]) return true;
  }

  if (/出版的图书|传记作家|人物传记|创作的人物传记|全球同步出版/.test(title)) {
    return true;
  }
  if (/^《.+传》/.test(title) || /（\d{4}年.*出版）/.test(title)) {
    return true;
  }
  if (/传（\d{4}年/.test(title)) {
    return true;
  }
  if (title.endsWith("传") && !/(人物|企业家|学者|演员|歌手)/.test(title)) {
    return true;
  }

  if (/内容开放、自由的网络百科全书|参与词条编辑，分享贡献你的知识/.test(entry.snippet)) {
    return true;
  }

  const titleMatchesPerson = searchNames.some(
    (n) => title === n || title.startsWith(`${n}（`) || title.includes(n),
  );
  if (!titleMatchesPerson) return true;

  return false;
}

export function sanitizeEnrichedSource(entry: EnrichedSource): EnrichedSource {
  const sourceKind =
    entry.sourceType === "wiki" ? "wiki" : entry.sourceType === "baike" ? "baike" : "web";
  const rawFull = entry.fullText ? decodeHtmlEntities(entry.fullText) : entry.fullText;
  const rawSnippet = decodeHtmlEntities(entry.snippet);
  const cleanFull = rawFull ? cleanEncyclopediaText(rawFull, sourceKind) : rawFull;
  const cleanSnippet = rawSnippet ? cleanEncyclopediaText(rawSnippet, sourceKind) : rawSnippet;

  return {
    ...entry,
    title: decodeHtmlEntities(entry.title),
    snippet: cleanSnippet || rawSnippet,
    fullText: cleanFull || rawFull,
  };
}
