import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export type AdSlotConfig = {
  enabled: boolean;
  eyebrow: string;
  title: string;
  description: string;
  ctaLabel: string;
  href: string;
  imageUrl: string;
};

export const DEFAULT_AD_SLOT: AdSlotConfig = {
  enabled: true,
  eyebrow: "推荐品牌",
  title: "深圳市了不起品牌管理有限公司",
  description: "专注品牌创新案例研究、品牌名片建设、正向传播与企业品牌增长服务。",
  ctaLabel: "了解品牌服务",
  href: "#",
  imageUrl: "",
};

const AD_SLOT_PATH = path.join(process.cwd(), "data", "ad-slot.json");

export async function getAdSlotConfig(): Promise<AdSlotConfig> {
  try {
    const raw = await readFile(AD_SLOT_PATH, "utf8");
    return { ...DEFAULT_AD_SLOT, ...(JSON.parse(raw) as Partial<AdSlotConfig>) };
  } catch {
    return DEFAULT_AD_SLOT;
  }
}

export async function saveAdSlotConfig(input: AdSlotConfig) {
  await mkdir(path.dirname(AD_SLOT_PATH), { recursive: true });
  await writeFile(AD_SLOT_PATH, JSON.stringify(input, null, 2), "utf8");
  return input;
}
