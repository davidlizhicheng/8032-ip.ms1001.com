"use client";

import { useState } from "react";
import {
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  Bookmark,
  Navigation,
  X,
  Building2,
  Sparkles,
  ShieldCheck,
  BadgeCheck,
} from "lucide-react";
import { VideoPreviewCard } from "@/components/ui/VideoPreviewCard";
import { BrandMediaTools } from "@/components/brand/BrandMediaTools";
import { getTheme } from "@/lib/themes";
import { resolveAssetUrl } from "@/lib/storage/public-url";

type CardData = {
  id: string;
  slug: string;
  name: string;
  title?: string | null;
  company?: string | null;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  brandSlogan?: string | null;
  bio?: string | null;
  phone?: string | null;
  email?: string | null;
  wechat?: string | null;
  address?: string | null;
  theme: string;
  sections: Array<{
    id: string;
    type: string;
    title: string;
    content: string;
  }>;
  mediaAssets: Array<{
    id: string;
    url: string;
    type: string;
    title?: string | null;
  }>;
  videoLinks: Array<{
    id: string;
    platform: string;
    url: string;
    title?: string | null;
    coverUrl?: string | null;
    embedUrl?: string | null;
    canEmbed: boolean;
  }>;
};

const SECTION_ORDER = ["story", "business", "service", "experience", "honor", "case"];

type ExchangeInfo = {
  enabled?: boolean;
  ownerResponsible?: boolean;
  note?: string;
};

type VerificationInfo = {
  status?: string;
  method?: string;
  account?: string;
  proofCount?: number;
  note?: string;
};

function parseSectionJson<T>(sections: CardData["sections"], type: string): T | null {
  const section = sections.find((s) => s.type === type);
  if (!section) return null;
  try {
    return JSON.parse(section.content) as T;
  } catch {
    return null;
  }
}

function sortSections(sections: CardData["sections"]) {
  return [...sections].sort((a, b) => {
    const ai = SECTION_ORDER.indexOf(a.type);
    const bi = SECTION_ORDER.indexOf(b.type);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

export function PublicCardView({ card }: { card: CardData }) {
  const theme = getTheme(card.theme);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [leadForm, setLeadForm] = useState({
    visitorName: "",
    visitorPhone: "",
    visitorWechat: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showMediaTools, setShowMediaTools] = useState(false);
  const [extraImages, setExtraImages] = useState(card.mediaAssets);

  const logoAsset = extraImages.find((m) => m.type === "logo");
  const proofImages = extraImages.filter((m) => m.title?.startsWith("认证材料"));
  const galleryImages = extraImages.filter((m) =>
    ["poster", "case", "honor", "gallery"].includes(m.type) && !m.title?.startsWith("认证材料"),
  );
  const exchangeInfo = parseSectionJson<ExchangeInfo>(card.sections, "exchange");
  const verificationInfo = parseSectionJson<VerificationInfo>(card.sections, "verification");
  const verificationApproved = verificationInfo?.status === "approved";

  const contentSections = sortSections(
    card.sections.filter((s) => !["avatar", "cover", "exchange", "verification"].includes(s.type)),
  );

  async function submitLead(source: string) {
    setSubmitting(true);
    try {
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: card.id, ...leadForm, source }),
      });
      setSubmitted(true);
      setTimeout(() => {
        setShowLeadModal(false);
        setSubmitted(false);
      }, 1500);
    } finally {
      setSubmitting(false);
    }
  }

  const contactBar = (
    <div className={`grid grid-cols-2 gap-2 rounded-2xl border bg-white p-3 shadow-sm sm:grid-cols-4 ${theme.border}`}>
      {card.phone && (
        <a
          href={`tel:${card.phone}`}
          className={`flex flex-col items-center gap-1 rounded-xl py-2.5 text-xs ${theme.hoverBg}`}
        >
          <Phone className={`h-5 w-5 ${theme.accent}`} />
          <span>电话</span>
        </a>
      )}
      {card.email && (
        <a
          href={`mailto:${card.email}`}
          className={`flex flex-col items-center gap-1 rounded-xl py-2.5 text-xs ${theme.hoverBg}`}
        >
          <Mail className={`h-5 w-5 ${theme.accent}`} />
          <span>邮件</span>
        </a>
      )}
      {card.address && (
        <a
          href={`https://maps.google.com/?q=${encodeURIComponent(card.address)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex flex-col items-center gap-1 rounded-xl py-2.5 text-xs ${theme.hoverBg}`}
        >
          <Navigation className={`h-5 w-5 ${theme.accent}`} />
          <span>拜访</span>
        </a>
      )}
      {(card.wechat || true) && (
        <button
          type="button"
          onClick={() => setShowLeadModal(true)}
          className={`flex flex-col items-center gap-1 rounded-xl py-2.5 text-xs ${theme.hoverBg}`}
        >
          <MessageCircle className={`h-5 w-5 ${theme.accent}`} />
          <span>{card.wechat ? "微信" : "咨询"}</span>
        </button>
      )}
    </div>
  );

  return (
    <div className={`min-h-screen ${theme.card} ${theme.text}`}>
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_14%_8%,rgba(251,191,36,0.16),transparent_28%),radial-gradient(circle_at_86%_12%,rgba(14,165,233,0.12),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.22),transparent_44%)]" />
      <div className="relative mx-auto max-w-6xl px-4 pb-32 pt-0 sm:px-6 lg:pb-20 lg:pt-8">
        {/* Hero — full width on mobile, sidebar on desktop */}
        <div className="lg:grid lg:grid-cols-[340px_1fr] lg:gap-8 lg:items-start">
          <aside className="lg:sticky lg:top-6">
            <div className={`relative overflow-hidden rounded-b-3xl border border-white/60 shadow-2xl shadow-black/10 lg:rounded-2xl ${theme.cover}`}>
              {card.coverUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolveAssetUrl(card.coverUrl)}
                  alt="封面"
                  className="absolute inset-0 h-full w-full object-cover opacity-24"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-white/40 to-white/92" />
              <div className="relative z-10 px-5 pb-8 pt-10 lg:p-7">
                <div className="flex items-start gap-4 lg:flex-col lg:items-center lg:text-center">
                  <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-2 border-white bg-white shadow-xl ring-4 ring-white/45 lg:h-32 lg:w-32">
                    {card.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={resolveAssetUrl(card.avatarUrl)}
                        alt={card.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className={`flex h-full w-full items-center justify-center text-3xl font-bold ${theme.accent}`}>
                        {card.name.slice(0, 1)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 lg:mt-4">
                    {logoAsset && (
                      <div className="mb-3 flex lg:justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={resolveAssetUrl(logoAsset.url)}
                          alt="Logo"
                          className="h-10 w-10 rounded-xl border border-white/70 bg-white object-contain p-1 shadow-sm"
                        />
                      </div>
                    )}
                    <h1 className="text-3xl font-black leading-tight text-slate-950 lg:text-4xl">{card.name}</h1>
                    {card.title && (
                      <p className={`mt-1 text-sm font-medium ${theme.accentText}`}>{card.title}</p>
                    )}
                    {card.company && (
                      <p className="mt-1 flex items-center gap-1 text-sm text-slate-600 lg:justify-center">
                        <Building2 className="h-3.5 w-3.5 shrink-0" />
                        {card.company}
                      </p>
                    )}
                  </div>
                </div>

                {card.brandSlogan && (
                  <p className={`mt-5 rounded-2xl border border-white/70 bg-white/65 px-4 py-3 text-sm font-semibold leading-relaxed shadow-sm backdrop-blur lg:text-center ${theme.accentText}`}>
                    「{card.brandSlogan}」
                  </p>
                )}

                <div className="mt-4 space-y-1.5 text-sm text-slate-600 lg:text-center">
                  {card.phone && <p className="flex items-center gap-2 lg:justify-center"><Phone className="h-3.5 w-3.5" />{card.phone}</p>}
                  {card.email && <p className="flex items-center gap-2 lg:justify-center"><Mail className="h-3.5 w-3.5" />{card.email}</p>}
                  {card.address && <p className="flex items-center gap-2 lg:justify-center"><MapPin className="h-3.5 w-3.5" />{card.address}</p>}
                </div>
                <div className="mt-5 rounded-2xl border border-emerald-100 bg-white/75 p-3 text-left text-xs leading-5 text-slate-600 shadow-sm lg:text-center">
                  <p className="flex items-center gap-1.5 font-semibold text-emerald-700 lg:justify-center">
                    {verificationInfo ? <ShieldCheck className="h-4 w-4" /> : <BadgeCheck className="h-4 w-4" />}
                    {verificationApproved ? "管理员已确认 · 本人可维护" : verificationInfo ? "本人提交认证材料 · 待管理员确认" : "本人自主管理名片"}
                  </p>
                  <p className="mt-1">
                    {exchangeInfo?.note || "本名片由本人或名片创建者自行提交并对真实性负责；交换名片用于商务联系与正向传播。网站展示认证状态与免责申明，不代替工商或官方认证。"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 hidden lg:block">{contactBar}</div>
          </aside>

          <main className="mt-4 space-y-5 lg:mt-0">
            <div className="lg:hidden">{contactBar}</div>

            <section className={`rounded-2xl border bg-white/90 p-6 shadow-sm backdrop-blur ${theme.border}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className={`text-xs font-bold uppercase tracking-[0.18em] ${theme.accentText}`}>Business Card Verification</p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">交换名片与真实性说明</h2>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {verificationApproved ? "已确认" : verificationInfo ? "材料待确认" : "本人负责"}
                </span>
              </div>
              <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="font-semibold text-slate-900">联系电话</p>
                  <p className="mt-1 break-all">{card.phone || "未公开"}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="font-semibold text-slate-900">公司地址</p>
                  <p className="mt-1">{card.address || "未填写详细地址"}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="font-semibold text-slate-900">认证线索</p>
                  <p className="mt-1">{verificationInfo?.account || verificationInfo?.method || "可补充执照/工牌、前台照片或公司邮箱"}</p>
                </div>
              </div>
              {proofImages.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {proofImages.slice(0, 2).map((img) => (
                    <div key={img.id} className="overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={resolveAssetUrl(img.url)} alt={img.title || "认证材料"} className="aspect-[4/3] w-full object-cover" />
                      <p className="px-3 py-2 text-xs text-slate-500">{img.title || "认证材料"}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {card.bio && (
              <section className={`rounded-2xl border bg-white/90 p-6 shadow-sm backdrop-blur ${theme.border}`}>
                <h2 className={`mb-3 flex items-center gap-2 text-lg font-bold ${theme.accent}`}>
                  <Sparkles className="h-5 w-5" />
                  个人简介
                </h2>
                <p className={`text-base leading-8 ${theme.muted}`}>{card.bio}</p>
              </section>
            )}

            {contentSections
              .filter((section) => {
                if (section.type === "business" && card.bio && section.content === card.bio) {
                  return false;
                }
                return true;
              })
              .map((section) => (
              <section
                key={section.id}
                className={`rounded-2xl border bg-white/88 p-6 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md ${theme.border}`}
              >
                <h2 className={`mb-3 text-xl font-black tracking-tight ${theme.accent}`}>{section.title}</h2>
                <div className={`whitespace-pre-line text-base leading-8 ${theme.muted}`}>
                  {section.content}
                </div>
              </section>
            ))}

            {galleryImages.length > 0 && (
              <section className={`rounded-2xl border bg-white/90 p-6 shadow-sm backdrop-blur ${theme.border}`}>
                <h2 className={`mb-4 text-lg font-bold ${theme.accent}`}>图片展示</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {galleryImages.map((img) => (
                    <div key={img.id} className="overflow-hidden rounded-xl">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={resolveAssetUrl(img.url)}
                        alt={img.title || "展示图"}
                        className="aspect-[4/3] w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {card.videoLinks.length > 0 && (
              <section className={`rounded-2xl border bg-white/90 p-6 shadow-sm backdrop-blur ${theme.border}`}>
                <h2 className={`mb-4 text-lg font-bold ${theme.accent}`}>视频介绍</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {card.videoLinks.map((video) => (
                    <VideoPreviewCard
                      key={video.id}
                      platform={video.platform}
                      url={video.url}
                      title={video.title || "视频内容"}
                      coverUrl={video.coverUrl}
                      embedUrl={video.embedUrl}
                      canEmbed={video.canEmbed}
                    />
                  ))}
                </div>
              </section>
            )}

            <section className={`overflow-hidden rounded-2xl border bg-white/90 shadow-sm backdrop-blur ${theme.border}`}>
              <div className="grid gap-0 sm:grid-cols-[1.15fr_0.85fr]">
                <div className="p-6">
                  <p className={`mb-2 text-xs font-bold uppercase tracking-[0.18em] ${theme.accentText}`}>
                    推荐阅读 / 广告位
                  </p>
                  <h2 className="text-xl font-black text-slate-950">把个人品牌页变成可持续更新的内容入口</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    这里可接入人物文章、活动报名、课程、品牌合作或第三方广告。当前先保留为平台推荐位，后续可在后台替换为指定链接。
                  </p>
                </div>
                <div className="flex min-h-[180px] items-center justify-center bg-gradient-to-br from-orange-100 via-sky-100 to-white p-6">
                  <div className="rounded-2xl bg-white/80 px-5 py-4 text-center shadow-sm">
                    <Sparkles className={`mx-auto mb-2 h-7 w-7 ${theme.accent}`} />
                    <p className="text-sm font-bold text-slate-900">文章 / 图片 / 广告</p>
                    <p className="mt-1 text-xs text-slate-500">可配置展示位</p>
                  </div>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>

      {/* Bottom bar — mobile */}
      <div className={`fixed bottom-0 left-0 right-0 z-50 border-t bg-white/95 backdrop-blur-lg lg:hidden ${theme.border}`}>
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
          {card.phone && (
            <a href={`tel:${card.phone}`} className={`flex flex-1 flex-col items-center gap-0.5 py-1 text-xs ${theme.muted}`}>
              <Phone className={`h-5 w-5 ${theme.accent}`} />
              电话
            </a>
          )}
          {card.email && (
            <a href={`mailto:${card.email}`} className={`flex flex-1 flex-col items-center gap-0.5 py-1 text-xs ${theme.muted}`}>
              <Mail className={`h-5 w-5 ${theme.accent}`} />
              邮件
            </a>
          )}
          <button
            type="button"
            onClick={() => setShowMediaTools(true)}
            className={`flex flex-1 flex-col items-center gap-0.5 py-1 text-xs ${theme.muted}`}
          >
            <Sparkles className={`h-5 w-5 ${theme.accent}`} />
            品牌素材
          </button>
          <button
            type="button"
            onClick={() => setShowLeadModal(true)}
            className={`flex flex-[2] items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold ${theme.button} ${theme.buttonText}`}
          >
            <Bookmark className="h-4 w-4" />
            收下名片
          </button>
        </div>
      </div>

      {/* Desktop floating CTA */}
      <div className="pointer-events-none fixed bottom-8 right-8 z-40 hidden lg:block">
        <button
          type="button"
          onClick={() => setShowLeadModal(true)}
          className={`pointer-events-auto flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold shadow-xl ${theme.button} ${theme.buttonText}`}
        >
          <Bookmark className="h-4 w-4" />
          收下名片
        </button>
      </div>

      {showMediaTools && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 text-slate-900 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">品牌 IP 图 / 上传素材</h3>
              <button type="button" onClick={() => setShowMediaTools(false)}>
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            <BrandMediaTools
              slug={card.slug}
              kind="card"
              targetId={card.id}
              searchQuery={card.name}
              entityType="person"
              themeButtonClass={theme.button}
              onImageAdded={(asset) => setExtraImages((prev) => [...prev, asset])}
            />
          </div>
        </div>
      )}

      {showLeadModal && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 text-slate-900 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">收下名片 / 留资咨询</h3>
              <button type="button" onClick={() => setShowLeadModal(false)}>
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            {submitted ? (
              <p className="py-8 text-center text-green-600">提交成功，感谢关注！</p>
            ) : (
              <div className="space-y-3">
                <input placeholder="您的姓名" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" value={leadForm.visitorName} onChange={(e) => setLeadForm({ ...leadForm, visitorName: e.target.value })} />
                <input placeholder="您的手机号" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" value={leadForm.visitorPhone} onChange={(e) => setLeadForm({ ...leadForm, visitorPhone: e.target.value })} />
                <input placeholder="您的微信号" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" value={leadForm.visitorWechat} onChange={(e) => setLeadForm({ ...leadForm, visitorWechat: e.target.value })} />
                <textarea placeholder="留言（选填）" rows={3} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" value={leadForm.message} onChange={(e) => setLeadForm({ ...leadForm, message: e.target.value })} />
                <button type="button" disabled={submitting} onClick={() => submitLead("save_card")} className="w-full rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white disabled:opacity-50">
                  {submitting ? "提交中..." : "确认收下名片"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
