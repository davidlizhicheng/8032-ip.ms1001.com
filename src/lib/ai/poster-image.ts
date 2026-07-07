/**
 * 从 poster.ms1001.com (poster-generator) 移植的制图提示词与调用逻辑
 * 第五步：品牌 Logo / 宣传海报（与检索、整合分离）
 */

import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import {
  localUploadServePath,
  normalizeStoredAssetUrl,
} from "@/lib/storage/public-url";
import { getUploadDir } from "@/lib/storage/upload-dir";

const DEFAULT_BASE = "https://api.fenno.ai/v1";
const DEFAULT_MODEL = "gpt-image-2";

export const SINGLE_IMAGE_GUARD =
  "【硬性输出要求】只生成一张完整图像，占满整个画布。" +
  "禁止拼图、禁止多宫格、禁止分屏、禁止一张图里出现多个编号或多种版式。";

export type BrandVisualTemplate =
  | "brand-logo"
  | "brand-poster"
  | "product-poster"
  | "ip-creative"
  | "social-cover"
  | "brand-event";

const TEMPLATE_META: Record<
  BrandVisualTemplate,
  { name: string; structure: string; style: string; size: string }
> = {
  "brand-logo": {
    name: "品牌 Logo",
    structure: "图形标志、品牌名、简洁符号、可识别 silhouette",
    style: "矢量感、留白充足、适合官网 favicon 与名片，纯色或双色为主",
    size: "1024x1024",
  },
  "brand-poster": {
    name: "品牌宣传海报",
    structure: "主标题、副标题、品牌 slogan、核心卖点、行动引导",
    style: "竖版商业海报，现代专业，主视觉突出",
    size: "1024x1536",
  },
  "product-poster": {
    name: "产品宣传海报",
    structure: "产品名、核心卖点、使用场景、购买理由",
    style: "产品特写与场景结合，商业质感",
    size: "1024x1536",
  },
  "ip-creative": {
    name: "IP 文创视觉",
    structure: "IP 角色、场景延展、品牌 slogan",
    style: "角色/IP 延展，趣味与品牌感兼具",
    size: "1024x1536",
  },
  "social-cover": {
    name: "自媒体封面",
    structure: "主标题、副标题、人物/产品焦点、品牌标识",
    style: "竖版信息流视觉，标题醒目",
    size: "1024x1536",
  },
  "brand-event": {
    name: "品牌活动海报",
    structure: "活动主题、主视觉口号、时间地点、报名提示",
    style: "庄重科技或红金蓝，适合发布会与品牌日",
    size: "1024x1536",
  },
};

function short(text: string, limit: number): string {
  const t = String(text || "").trim();
  return t.length > limit ? t.slice(0, limit) : t;
}

/** 移植 poster 的 prompt 候选降级策略 */
export function imagePromptCandidates(prompt: string): string[] {
  const full = String(prompt || "").trim();
  const compact = full.replace(/[。；;]\s*/g, "，").replace(/，+$/, "");
  const compactCut = compact.length > 80 ? `${compact.slice(0, 80).replace(/，+$/, "")}。` : compact;
  const fallback = "生成一张竖版中文商业品牌海报，要有大标题、品牌标识与清晰主视觉。";
  const out: string[] = [];
  for (const item of [full, compactCut, fallback]) {
    if (item && !out.includes(item)) out.push(item);
  }
  return out;
}

export function buildBrandVisualPrompt(options: {
  template: BrandVisualTemplate;
  brandName: string;
  entityType?: string;
  title?: string;
  subject?: string;
  audience?: string;
  slogan?: string;
  summary?: string;
  userPrompt?: string;
}): string {
  const meta = TEMPLATE_META[options.template];
  const typeLabel =
    options.entityType === "city"
      ? "城市"
      : options.entityType === "company"
        ? "企业"
        : options.entityType === "person"
          ? "人物"
          : "品牌";

  const campaign = short(options.brandName, 14);
  const titleText = short(options.title || options.brandName, 22);
  const subjectText = short(options.subject || typeLabel, 14);
  const audienceText = short(options.audience || "目标客户", 14);
  const sloganText = short(options.slogan || "", 40);
  const summaryText = short(options.summary || "", 120);
  const userExtra = short(options.userPrompt || "", 180);

  if (options.template === "brand-logo") {
    return (
      `为「${campaign}」设计一枚${typeLabel}品牌 Logo 标志。` +
      `风格：${meta.style}。结构：${meta.structure}。` +
      `${sloganText ? `品牌口号参考：${sloganText}。` : ""}` +
      `${summaryText ? `背景：${summaryText}。` : ""}` +
      `不要复杂背景，不要多方案并排，不要水印文字。${SINGLE_IMAGE_GUARD}` +
      (userExtra ? `用户补充：${userExtra}。` : "")
    );
  }

  return (
    `竖版中文${meta.name}。项目:${campaign}。主题:${titleText}。` +
    `类型:${typeLabel}。领域:${subjectText}。受众:${audienceText}。` +
    `内容:${meta.structure}。风格:${meta.style}。` +
    `${sloganText ? `口号:${sloganText}。` : ""}` +
    `${summaryText ? `摘要:${summaryText}。` : ""}` +
    SINGLE_IMAGE_GUARD +
    (userExtra ? `用户补充：${userExtra}。` : "")
  );
}

function imageEndpoint(baseUrl: string): string {
  const base = (baseUrl || DEFAULT_BASE).replace(/\/$/, "");
  if (base.endsWith("/images/generations")) return base;
  if (base.endsWith("/v1")) return `${base}/images/generations`;
  if (base.endsWith("/v1/images")) return `${base}/generations`;
  return `${base}/v1/images/generations`;
}

async function saveImageBuffer(buffer: Buffer, ext = "png") {
  const filename = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${ext}`;
  const uploadDir = getUploadDir();
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), buffer);
  return normalizeStoredAssetUrl(localUploadServePath(filename))!;
}

export async function generateBrandVisual(options: {
  template: BrandVisualTemplate;
  brandName: string;
  entityType?: string;
  title?: string;
  slogan?: string;
  summary?: string;
  userPrompt?: string;
}): Promise<{ url: string; prompt: string; template: BrandVisualTemplate }> {
  const meta = TEMPLATE_META[options.template];
  const prompt = buildBrandVisualPrompt(options);
  const apiKey = process.env.FENNO_API_KEY || process.env.POSTER_API_KEY;
  if (!apiKey) {
    throw new Error("未配置 FENNO_API_KEY / POSTER_API_KEY，无法生成品牌视觉");
  }

  const baseUrl = process.env.FENNO_BASE_URL || process.env.FENNO_IMAGE_BASE_URL || DEFAULT_BASE;
  const model = process.env.FENNO_IMAGE_MODEL || DEFAULT_MODEL;
  const quality = process.env.FENNO_IMAGE_QUALITY || "medium";
  const size =
    options.template === "brand-logo"
      ? process.env.FENNO_LOGO_SIZE || "1024x1024"
      : process.env.FENNO_IMAGE_SIZE || meta.size;

  let lastError = "未知错误";
  for (const promptItem of imagePromptCandidates(prompt)) {
    try {
      const res = await fetch(imageEndpoint(baseUrl), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          model,
          prompt: `${promptItem}\n\n${SINGLE_IMAGE_GUARD}`,
          size,
          quality,
          background: "opaque",
          output_format: "png",
          n: 1,
        }),
      });
      const raw = await res.text();
      if (!res.ok) {
        lastError = `HTTP ${res.status}: ${raw.slice(0, 200)}`;
        continue;
      }
      const data = JSON.parse(raw) as { data?: Array<{ b64_json?: string; url?: string }> };
      const imageData = data.data?.[0];
      if (!imageData) continue;

      if (imageData.b64_json) {
        const url = await saveImageBuffer(Buffer.from(imageData.b64_json, "base64"), "png");
        return { url, prompt: promptItem, template: options.template };
      }
      if (imageData.url) {
        const imgRes = await fetch(imageData.url);
        if (!imgRes.ok) throw new Error("下载生成图片失败");
        const url = await saveImageBuffer(Buffer.from(await imgRes.arrayBuffer()), "png");
        return { url, prompt: promptItem, template: options.template };
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }
  throw new Error(`品牌视觉生成失败：${lastError}`);
}

/** 兼容旧 IP 图接口 */
export async function generateIpImage(options: {
  name: string;
  entityType: string;
  summary?: string;
  slogan?: string;
}) {
  return generateBrandVisual({
    template: "ip-creative",
    brandName: options.name,
    entityType: options.entityType,
    summary: options.summary,
    slogan: options.slogan,
  });
}
