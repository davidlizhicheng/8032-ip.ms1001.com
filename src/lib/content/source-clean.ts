/**
 * 百科/维基/网页正文清洗：去除导航、脚注、参考文献等不可发布内容。
 */

const WIKI_JUNK_PATTERNS = [
  /^本[條条]目存在以下問題/,
  /^此[條条]目\s*形似\s*新聞稿/,
  /^请协助以.*?撰寫本條目/,
  /^請協助以.*?撰寫本條目/,
  /^非常\s*明显\s*的广告内容/,
  /^本[條条]目\s*應避免有/,
  /^维基百科[，,]?自由的百科全书/,
  /^搜索维基百科/,
  /^创建账号\s*登录/,
  /^维基百科志愿者/,
  /^维基百科，自由的百科全书/,
  /^Telegram：/,
  /^Discord及/,
  /^#wikipedia-zh/,
  /^深色\s*这是一篇优良条目/,
  /^坐标：\d/,
  /^维基百科，自由的百科全书/,
  /^查论编/,
  /^本页面最后修订于/,
  /^本站的全部文字在知识共享/,
  /^Wikipedia®和维基百科标志/,
  /^维基媒体基金会/,
  /^隐私政策关于维基百科/,
  /^规范控制数据库/,
  /^编辑维基数据链接/,
  /^分类：/,
  /^查\s*论\s*编/,
  /^跳转到内容/,
  /^Jump to content/,
  /^From Wikipedia, the free encyclopedia/,
  /^Contents\s*\d/,
  /^References\s*\d/,
  /^External links/,
  /^See also/,
  /^脚注/,
  /^参考文献/,
  /^外部链接/,
  /^参见/,
  /^来源\s*主要地方史志/,
  /^开放街图上有关/,
  /^维基导游上的相关旅行指南/,
];

const BAIKE_JUNK_PATTERNS = [
  /^内容开放、自由的网络百科全书/,
  /^参与词条编辑，分享贡献你的知识/,
  /^百度百科是一部内容开放、自由的网络百科全书/,
  /^词条统计/,
  /^编辑次数/,
  /^最近更新/,
];

const INLINE_JUNK =
  /(?:维基百科自由的百科全书|搜索维基百科|资助维基百科|创建账号\s*登录|CtrlK|Powered by MediaWiki|Wikimedia Foundation|维基百科志愿者互联交流群|跳转到内容|bodyContent|本[條条]目存在以下問題|请协助以\s*中立的觀點|請協助以\s*中立的觀點|DeleteG11|提请删除|提請刪除|手工转换|Zh_conversion_icon)/g;

/** 大块维基/UI 模板（非正文） */
const WIKI_BLOCK_PATTERNS: RegExp[] = [
  /本[條条]目存在以下問題[\s\S]*?(?=\n#|\n\*\*|[^\s]{2,10}商贸|成立于|是一家)/,
  /维基百科志愿者互联交流群[\s\S]*?欢迎大家加入。/,
  /跳转到内容[\s\S]*?自由的百科全书\s*/i,
  /!\[[^\]]*\]\([^)]*wikimedia[^)]*\)[^\n]*/gi,
  /\[跳转到内容\][^\n]*/g,
  /#\s*[^\n]+\s*---\s*\*\*本[條条]目/g,
  /请协助[^。]{0,80}。/g,
  /請協助[^。]{0,80}。/g,
  /\| --- \|/g,
  /\| 于东来 \|/g,
];

function isJunkLine(line: string): boolean {
  const t = line.trim();
  if (!t || t.length < 4) return true;
  if (/^[\d\s|·\-–—]+$/.test(t)) return true;
  if (/^STEP \d+/i.test(t)) return true;
  if (/^查论编/.test(t)) return true;
  if (/^坐标：\d/.test(t)) return true;
  if (/^规范控制/.test(t)) return true;
  if (/^分类：/.test(t) && t.length < 80) return true;
  if (/^本页面最后修订于/.test(t)) return true;
  if (/^维基百科，自由的百科全书/.test(t)) return true;
  for (const p of [...WIKI_JUNK_PATTERNS, ...BAIKE_JUNK_PATTERNS]) {
    if (p.test(t)) return true;
  }
  return false;
}

/** 检测文本是否像未清洗的百科页面 dump */
export function looksLikeRawEncyclopediaDump(text: string): boolean {
  if (!text?.trim()) return false;
  const markers = [
    "维基百科自由的百科全书",
    "搜索维基百科",
    "创建账号 登录",
    "Powered by MediaWiki",
    "规范控制数据库",
    "本页面最后修订于",
    "内容开放、自由的网络百科全书",
    "查论编",
    "维基百科志愿者互联交流群",
    "跳转到内容",
    "本条目存在以下问题",
    "本條目存在以下問題",
    "请协助以 中立的觀點",
    "DeleteG11",
    "bodyContent",
  ];
  let hits = 0;
  for (const m of markers) {
    if (text.includes(m)) hits++;
  }
  return hits >= 1 || (hits >= 1 && text.length > 3000);
}

export function cleanEncyclopediaText(text: string, sourceType?: "wiki" | "baike" | "web"): string {
  if (!text?.trim()) return "";

  let cleaned = text;
  for (const re of WIKI_BLOCK_PATTERNS) {
    cleaned = cleaned.replace(re, " ");
  }
  cleaned = cleaned.replace(INLINE_JUNK, " ").replace(/\s+/g, " ").trim();

  const paragraphs = cleaned
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length >= 8 && !isJunkLine(p));

  if (paragraphs.length >= 2) {
    cleaned = paragraphs.join("\n\n");
  } else {
    cleaned = cleaned
      .split(/(?<=[。！？.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 12 && !isJunkLine(s))
      .join("");
  }

  if (sourceType === "wiki" && cleaned.length > 12000) {
    const refIdx = cleaned.search(/(?:^|\n)(?:参考文献|脚注|外部链接|参见|规范控制)/);
    if (refIdx > 500) cleaned = cleaned.slice(0, refIdx).trim();
  }

  return cleaned.trim();
}

export function isPublishableContent(text: string): boolean {
  const t = text?.trim() || "";
  if (t.length < 80) return false;
  if (looksLikeRawEncyclopediaDump(t)) return false;
  if (/^[\[\【]权威资料/.test(t)) return false;
  return true;
}
