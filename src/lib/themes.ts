import type { CardTheme } from "@/lib/schemas/card";
import type { EntityType } from "@/lib/schemas/entity";

export type ThemeConfig = {
  id: CardTheme;
  label: string;
  cover: string;
  accent: string;
  accentText: string;
  card: string;
  text: string;
  muted: string;
  border: string;
  button: string;
  buttonText: string;
  link: string;
  linkHover: string;
  iconBg: string;
  iconText: string;
  hoverBorder: string;
  hoverBg: string;
  scoreAccent: string;
  heroBorder: string;
};

export const THEMES: Record<CardTheme, ThemeConfig> = {
  business_gold_dark: {
    id: "business_gold_dark",
    label: "浅色商务金",
    cover: "bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100",
    accent: "text-amber-700",
    accentText: "text-amber-800",
    card: "bg-[#fffbeb]",
    text: "text-slate-900",
    muted: "text-slate-600",
    border: "border-amber-200/80",
    button: "bg-amber-500 hover:bg-amber-600",
    buttonText: "text-white",
    link: "text-amber-700",
    linkHover: "hover:text-amber-800",
    iconBg: "bg-gradient-to-br from-amber-50 to-orange-100",
    iconText: "text-amber-700",
    hoverBorder: "hover:border-amber-300",
    hoverBg: "hover:bg-amber-50/70",
    scoreAccent: "text-amber-600",
    heroBorder: "border-amber-300/80",
  },
  professional_light: {
    id: "professional_light",
    label: "白底专业型",
    cover: "bg-gradient-to-br from-slate-50 to-slate-200",
    accent: "text-blue-700",
    accentText: "text-blue-600",
    card: "bg-white",
    text: "text-slate-900",
    muted: "text-slate-500",
    border: "border-slate-200",
    button: "bg-blue-600 hover:bg-blue-500",
    buttonText: "text-white",
    link: "text-blue-600",
    linkHover: "hover:text-blue-700",
    iconBg: "bg-gradient-to-br from-blue-50 to-sky-100",
    iconText: "text-blue-700",
    hoverBorder: "hover:border-blue-300",
    hoverBg: "hover:bg-blue-50/50",
    scoreAccent: "text-blue-600",
    heroBorder: "border-blue-300/80",
  },
  education_blue: {
    id: "education_blue",
    label: "深圳蓝",
    cover: "bg-gradient-to-br from-[#0c4a8a] via-[#1565b8] to-[#0ea5e9]",
    accent: "text-sky-700",
    accentText: "text-sky-800",
    card: "bg-[#f0f6fc]",
    text: "text-slate-900",
    muted: "text-slate-600",
    border: "border-sky-200/80",
    button: "bg-[#1565b8] hover:bg-[#0c4a8a]",
    buttonText: "text-white",
    link: "text-[#1565b8]",
    linkHover: "hover:text-[#0c4a8a]",
    iconBg: "bg-gradient-to-br from-sky-50 to-blue-100",
    iconText: "text-[#1565b8]",
    hoverBorder: "hover:border-sky-300",
    hoverBg: "hover:bg-sky-50/60",
    scoreAccent: "text-sky-600",
    heroBorder: "border-sky-200/80",
  },
  brand_orange: {
    id: "brand_orange",
    label: "品牌橙",
    cover: "bg-gradient-to-br from-[#9a3412] via-[#ea580c] to-[#f59e0b]",
    accent: "text-orange-700",
    accentText: "text-orange-800",
    card: "bg-[#fff7ed]",
    text: "text-slate-900",
    muted: "text-slate-600",
    border: "border-orange-200/80",
    button: "bg-orange-500 hover:bg-orange-600",
    buttonText: "text-white",
    link: "text-orange-600",
    linkHover: "hover:text-orange-700",
    iconBg: "bg-gradient-to-br from-orange-50 to-amber-100",
    iconText: "text-orange-600",
    hoverBorder: "hover:border-orange-300",
    hoverBg: "hover:bg-orange-50/70",
    scoreAccent: "text-orange-600",
    heroBorder: "border-amber-200/90",
  },
  brand_purple: {
    id: "brand_purple",
    label: "品牌紫",
    cover: "bg-gradient-to-br from-[#581c87] via-[#7c3aed] to-[#c026d3]",
    accent: "text-purple-700",
    accentText: "text-purple-800",
    card: "bg-[#faf5ff]",
    text: "text-slate-900",
    muted: "text-slate-600",
    border: "border-purple-200/80",
    button: "bg-purple-600 hover:bg-purple-700",
    buttonText: "text-white",
    link: "text-purple-600",
    linkHover: "hover:text-purple-700",
    iconBg: "bg-gradient-to-br from-purple-50 to-fuchsia-100",
    iconText: "text-purple-600",
    hoverBorder: "hover:border-purple-300",
    hoverBg: "hover:bg-purple-50/70",
    scoreAccent: "text-purple-600",
    heroBorder: "border-fuchsia-200/90",
  },
  creator_bold: {
    id: "creator_bold",
    label: "高视觉冲击型",
    cover: "bg-gradient-to-br from-fuchsia-100 via-purple-100 to-indigo-100",
    accent: "text-fuchsia-700",
    accentText: "text-purple-800",
    card: "bg-[#fdf4ff]",
    text: "text-slate-900",
    muted: "text-slate-600",
    border: "border-purple-200/80",
    button: "bg-fuchsia-600 hover:bg-fuchsia-700",
    buttonText: "text-white",
    link: "text-fuchsia-600",
    linkHover: "hover:text-fuchsia-700",
    iconBg: "bg-gradient-to-br from-fuchsia-50 to-purple-100",
    iconText: "text-fuchsia-600",
    hoverBorder: "hover:border-fuchsia-300",
    hoverBg: "hover:bg-fuchsia-50/70",
    scoreAccent: "text-fuchsia-600",
    heroBorder: "border-fuchsia-300/80",
  },
  poster_showcase: {
    id: "poster_showcase",
    label: "海报展示型",
    cover: "bg-gradient-to-br from-rose-50 via-orange-50 to-amber-100",
    accent: "text-orange-700",
    accentText: "text-rose-800",
    card: "bg-[#fff7ed]",
    text: "text-slate-900",
    muted: "text-slate-600",
    border: "border-orange-200/80",
    button: "bg-orange-500 hover:bg-orange-600",
    buttonText: "text-white",
    link: "text-orange-600",
    linkHover: "hover:text-orange-700",
    iconBg: "bg-gradient-to-br from-orange-50 to-rose-100",
    iconText: "text-orange-600",
    hoverBorder: "hover:border-orange-300",
    hoverBg: "hover:bg-orange-50/70",
    scoreAccent: "text-orange-600",
    heroBorder: "border-orange-300/80",
  },
};

export function getTheme(theme?: string | null): ThemeConfig {
  if (theme && theme in THEMES) {
    return THEMES[theme as CardTheme];
  }
  return THEMES.brand_orange;
}

/** 深圳保留蓝色，城市/企业用橙色，人物用紫色 */
export function getDefaultEntityTheme(
  type: EntityType | string,
  slug?: string,
  name?: string,
): CardTheme {
  if (type === "city" && (slug === "shenzhen" || name === "深圳")) {
    return "education_blue";
  }
  if (type === "person") return "brand_purple";
  if (type === "city" || type === "company" || type === "brand") return "brand_orange";
  return "brand_orange";
}
