"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Bookmark,
  Building2,
  ChevronRight,
  ExternalLink,
  FileText,
  Globe2,
  Landmark,
  MapPin,
  MessageCircle,
  Newspaper,
  Phone,
  Mail,
  Send,
  Shield,
  Sparkles,
  TrendingUp,
  Users,
  Loader2,
  Upload,
  Video,
} from "lucide-react";
import { getTheme, getDefaultEntityTheme } from "@/lib/themes";
import { resolveAssetUrl } from "@/lib/storage/public-url";
import { ImageUploader } from "@/components/ui/ImageUploader";
import { ImageSearchPanel } from "@/components/media/ImageSearchPanel";
import { BrandImageGallery } from "@/components/media/BrandImageGallery";
import { VideoPreviewCard } from "@/components/ui/VideoPreviewCard";
import {
  getDisclaimer,
  AI_DISCLAIMER,
} from "@/lib/compliance/risk-check";
import {
  ENTITY_TYPE_LABELS,
  PERSON_SUBTYPE_LABELS,
  type EntityProfileContent,
  type EntityReportContent,
  type EntityReportScores,
} from "@/lib/schemas/entity";
import {
  hasPublicContact,
  mergeContactIntoContentJson,
  parseEntityContact,
  type EntityContactInfo,
} from "@/lib/content/entity-contact";
import { entityPath, reportPath } from "@/lib/utils/entity-paths";
import { GenerateReportButton } from "@/components/report/GenerateReportButton";
import { GenerationProgressPanel } from "@/components/report/GenerationProgressPanel";
import { sanitizeSections } from "@/lib/content/sanitize-placeholder";
import { dedupeSources, formatSourceLabel } from "@/lib/search/source-dedupe";
import { filterRealNews, isPlaceholderNewsItem } from "@/lib/news/filter-news";
import { EntityLikeButton } from "@/components/entity/EntityLikeButton";
import { useAuth } from "@/components/auth/AuthProvider";
import { authFetch } from "@/lib/auth/client";
import type { AdSlotConfig } from "@/lib/services/ad-slot";

function mapSearchEntityType(
  type: string,
): "company" | "brand" | "person" | "city" | undefined {
  if (type === "person" || type === "city" || type === "brand" || type === "company") {
    return type;
  }
  return undefined;
}

type EntityPageData = {
  id: string;
  type: string;
  name: string;
  slug: string;
  visibility?: string;
  subtype?: string | null;
  status: string;
  isVerified: boolean;
  likeCount?: number;
  profile: {
    title?: string | null;
    subtitle?: string | null;
    summary?: string | null;
    slogan?: string | null;
    coverUrl?: string | null;
    avatarUrl?: string | null;
    contentJson: string;
    theme: string;
    seoTitle?: string | null;
  } | null;
  reports: Array<{
    id: string;
    reportType: string;
    title: string;
    summary?: string | null;
    contentJson: string;
    scoreJson?: string | null;
  }>;
  sources: Array<{
    id: string;
    title: string;
    url?: string | null;
    sourceType: string;
    excerpt?: string | null;
    confidenceScore: number;
  }>;
  newsArticles: Array<{
    id: string;
    title: string;
    url: string;
    source?: string | null;
    publishedAt?: string | null;
    excerpt?: string | null;
  }>;
  relationsFrom: Array<{
    relationType: string;
    label?: string | null;
    toEntity: { id: string; type: string; name: string; slug: string; profile?: { slogan?: string | null } | null };
  }>;
  relationsTo: Array<{
    relationType: string;
    label?: string | null;
    fromEntity: { id: string; type: string; name: string; slug: string; profile?: { slogan?: string | null } | null };
  }>;
  mediaAssets?: Array<{ id: string; url: string; type: string; title?: string | null }>;
  videoLinks?: Array<{
    id: string;
    platform: string;
    url: string;
    title?: string | null;
    coverUrl?: string | null;
    embedUrl?: string | null;
    canEmbed: boolean;
  }>;
};

const SECTION_ICONS: Record<string, typeof Building2> = {
  positioning: MapPin,
  industry: TrendingUp,
  companies: Building2,
  education: Landmark,
  tourism: Globe2,
  business: Sparkles,
  slogan: Sparkles,
  investment: TrendingUp,
  intro: Building2,
  products: Sparkles,
  leadership: Users,
  model: TrendingUp,
  growth: TrendingUp,
  advantage: Sparkles,
  competitors: TrendingUp,
  bio: Users,
  identity: Users,
  company: Building2,
  brand: Sparkles,
  experience: TrendingUp,
  influence: Globe2,
  cooperation: Users,
  story: Sparkles,
  overview: Users,
  skills: Sparkles,
  scenarios: Globe2,
};

function parseProfile(json: string): EntityProfileContent {
  try {
    const parsed = JSON.parse(json) as EntityProfileContent;
    return {
      ...parsed,
      sections: sanitizeSections(parsed.sections || []),
      contact: parseEntityContact(json),
    };
  } catch {
    return { sections: [], tags: [], keywords: [] };
  }
}

function emptyContactDraft(): EntityContactInfo {
  return { phone: "", email: "", wechat: "", address: "" };
}

function ScoreRing({ score, accentClass }: { score: number; accentClass: string }) {
  const pct = Math.min(100, Math.max(0, score * 10));
  const r = 42;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <div className="relative flex h-28 w-28 items-center justify-center">
      <svg className="-rotate-90" width="112" height="112" viewBox="0 0 112 112">
        <circle cx="56" cy="56" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-200" />
        <circle
          cx="56"
          cy="56"
          r={r}
          fill="none"
          stroke="url(#scoreGradient)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
        <defs>
          <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute text-center">
        <p className={`text-3xl font-bold ${accentClass}`}>{score}</p>
        <p className="text-[10px] uppercase tracking-wider text-slate-400">综合分</p>
      </div>
    </div>
  );
}

function ScoreGrid({ scores, accentClass }: { scores: EntityReportScores; accentClass: string }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {Object.entries(scores).map(([label, value]) => (
        <div
          key={label}
          className="rounded-xl border border-slate-100 bg-white/80 px-3 py-2.5"
        >
          <p className="text-[11px] leading-tight text-slate-500">{label}</p>
          <p className={`mt-1 text-lg font-bold ${accentClass}`}>{value}</p>
        </div>
      ))}
    </div>
  );
}

export function EntityPageView({
  entity,
  discoveredBrandImages = [],
  adSlot,
}: {
  entity: EntityPageData;
  discoveredBrandImages?: Array<{ url: string; title?: string; source?: string }>;
  adSlot?: AdSlotConfig;
}) {
  const { user, brandUpgrade, login, openBilling, isAdmin } = useAuth();
  const theme = getTheme(getDefaultEntityTheme(entity.type, entity.slug, entity.name));
  const content = parseProfile(entity.profile?.contentJson || "{}");
  const displayNews = entity.newsArticles.filter(
    (a) => a.title?.trim() && a.url?.trim() && !isPlaceholderNewsItem(a),
  );
  const displaySources = dedupeSources(entity.sources);
  const displaySections = content.sections.filter((section, index, arr) => {
    const key = section.content.trim().slice(0, 120);
    if (!key || key.length < 40) return false;
    return arr.findIndex((s) => s.content.trim().slice(0, 120) === key) === index;
  });
  const disclaimer = getDisclaimer(
    entity.type as "city",
    entity.subtype,
    entity.isVerified,
  );
  const typeLabel = ENTITY_TYPE_LABELS[entity.type as keyof typeof ENTITY_TYPE_LABELS] || entity.type;
  const subtypeLabel = entity.subtype ? PERSON_SUBTYPE_LABELS[entity.subtype] : null;
  const isCity = entity.type === "city";
  const isCompanyCard = entity.type === "company" || entity.type === "brand";
  const publicContact = content.contact || {};
  const showPublicContact = isCompanyCard && hasPublicContact(publicContact);
  const showBrandImages = Boolean(mapSearchEntityType(entity.type));

  const latestReport = entity.reports[0];
  let reportScores: EntityReportScores = {};
  let overallScore = 0;

  if (latestReport?.scoreJson) {
    try {
      const parsed = JSON.parse(latestReport.scoreJson);
      reportScores = parsed.scores || {};
      overallScore = parsed.overall || 0;
    } catch { /* ignore */ }
  }

  const related = [
    ...entity.relationsFrom.map((r) => ({ ...r.toEntity, rel: r.label || r.relationType })),
    ...entity.relationsTo.map((r) => ({ ...r.fromEntity, rel: r.label || r.relationType })),
  ];

  const [showClaim, setShowClaim] = useState(false);
  const [claimForm, setClaimForm] = useState({ proofText: "", contactName: "", contactPhone: "" });
  const [claimMsg, setClaimMsg] = useState("");
  const [mediaImages, setMediaImages] = useState(entity.mediaAssets || []);
  const [mediaVideos, setMediaVideos] = useState(entity.videoLinks || []);
  const [videoUrl, setVideoUrl] = useState("");
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [generatingIpImage, setGeneratingIpImage] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [updateJob, setUpdateJob] = useState<{ jobId: string; itemId: string } | null>(null);
  const [updatingEntity, setUpdatingEntity] = useState(false);
  const [updateMsg, setUpdateMsg] = useState("");
  const [exchangeForm, setExchangeForm] = useState({
    visitorName: "",
    visitorPhone: "",
    visitorWechat: "",
    message: "",
  });
  const [chatText, setChatText] = useState("");
  const [contactMsg, setContactMsg] = useState("");
  const [submittingContact, setSubmittingContact] = useState(false);
  const [canEditPage, setCanEditPage] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [editorMsg, setEditorMsg] = useState("");
  const [savingEditor, setSavingEditor] = useState(false);
  const [grantName, setGrantName] = useState("");
  const [editors, setEditors] = useState<Array<Record<string, unknown>>>([]);
  const [revisions, setRevisions] = useState<Array<Record<string, unknown>>>([]);
  const [editorTab, setEditorTab] = useState<"page" | "report" | "admin">("page");
  const [editDraft, setEditDraft] = useState({
    name: entity.name,
    title: entity.profile?.title || "",
    subtitle: entity.profile?.subtitle || "",
    slogan: entity.profile?.slogan || "",
    summary: entity.profile?.summary || "",
    contentJson: entity.profile?.contentJson || "{}",
    seoTitle: entity.profile?.seoTitle || "",
    seoDescription: "",
    theme: entity.profile?.theme || "",
    visibility: entity.visibility || "private",
    status: entity.status,
    contact: {
      ...emptyContactDraft(),
      ...parseEntityContact(entity.profile?.contentJson),
    },
  });
  const [reportDraft, setReportDraft] = useState({
    reportId: latestReport?.id || "",
    title: latestReport?.title || "",
    summary: latestReport?.summary || "",
    contentJson: latestReport?.contentJson || "{}",
    scoreJson: latestReport?.scoreJson || "{}",
  });

  const heroCoverUrl =
    entity.profile?.coverUrl ||
    mediaImages.find((m) => m.type === "cover")?.url ||
    discoveredBrandImages[0]?.url ||
    "";

  useEffect(() => {
    if (!user) {
      setCanEditPage(false);
      return;
    }
    authFetch(`/api/entities/${entity.slug}/content`)
      .then((res) => setCanEditPage(res.ok))
      .catch(() => setCanEditPage(false));
  }, [entity.slug, user]);

  async function openPageEditor() {
    setShowEditor(true);
    setEditorMsg("");
    await Promise.all([loadEditors(), loadRevisions()]);
  }

  async function loadEditors() {
    const res = await authFetch(`/api/entities/${entity.slug}/editors`);
    const data = await res.json().catch(() => ({}));
    if (res.ok) setEditors([...(data.owner ? [{ owner: true, user: data.owner }] : []), ...(data.editors || [])]);
  }

  async function loadRevisions() {
    const res = await authFetch(`/api/entities/${entity.slug}/revisions`);
    const data = await res.json().catch(() => ({}));
    if (res.ok) setRevisions(data.revisions || []);
  }

  async function savePageEdit() {
    setSavingEditor(true);
    setEditorMsg("保存中...");
    try {
      const { contact, contentJson, ...rest } = editDraft;
      const res = await authFetch(`/api/entities/${entity.slug}/content`, {
        method: "PATCH",
        body: JSON.stringify({
          ...rest,
          contentJson: mergeContactIntoContentJson(contentJson, contact),
          note: "页面内可视化编辑",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存失败");
      setEditorMsg("已保存。刷新后可看到最新页面内容。");
      await loadRevisions();
    } catch (error) {
      setEditorMsg(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSavingEditor(false);
    }
  }

  async function grantEditor() {
    const username = grantName.trim();
    if (!username) return;
    setEditorMsg("授权中...");
    const res = await authFetch(`/api/entities/${entity.slug}/editors`, {
      method: "POST",
      body: JSON.stringify({ username, role: "editor" }),
    });
    const data = await res.json().catch(() => ({}));
    setEditorMsg(res.ok ? "已授权编辑" : data.error || "授权失败");
    if (res.ok) {
      setGrantName("");
      await Promise.all([loadEditors(), loadRevisions()]);
    }
  }

  async function handleUploadError(data: { error?: string; code?: string }) {
    if (data.code === "LOGIN_REQUIRED") {
      setUploadMsg("请先登录后再上传更多图片");
      login("login");
      return;
    }
    if (data.code === "UPGRADE_REQUIRED") {
      setUploadMsg("多图上传需开通品牌升级（500元）");
      try {
        await openBilling({ entityId: entity.id });
      } catch {
        /* ignore redirect errors */
      }
      return;
    }
    setUploadMsg(data.error || "操作失败");
  }

  async function attachImageUrl(url: string) {
    if (!url) return;
    setUploadMsg("保存中…");
    const res = await authFetch(`/api/entities/${entity.slug}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl: url, type: "gallery" }),
    });
    const data = await res.json();
    if (data.asset) {
      setMediaImages((prev) => [...prev, data.asset]);
      setUploadMsg("图片已上传");
    } else {
      await handleUploadError(data);
    }
  }

  async function generateIpImage() {
    if (!user) {
      login("login");
      return;
    }
    if (!brandUpgrade) {
      setUploadMsg("AI 生成 IP 图需开通品牌升级（500元）");
      try {
        await openBilling({ entityId: entity.id });
      } catch {
        /* ignore */
      }
      return;
    }
    setGeneratingIpImage(true);
    setUploadMsg("AI 正在生成品牌 IP 图…");
    try {
      const res = await authFetch(`/api/entities/${entity.slug}/generate-ip-image`, {
        method: "POST",
        body: JSON.stringify({ target: "cover" }),
      });
      const data = await res.json();
      if (data.asset) {
        setMediaImages((prev) => [...prev, data.asset]);
        setUploadMsg("品牌 IP 图已生成");
      } else {
        await handleUploadError(data);
      }
    } catch {
      setUploadMsg("生成失败，请稍后重试");
    } finally {
      setGeneratingIpImage(false);
    }
  }

  async function addVideo() {
    if (!videoUrl.trim()) return;
    setUploadingVideo(true);
    setUploadMsg("");
    const res = await authFetch(`/api/entities/${entity.slug}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoUrl: videoUrl.trim() }),
    });
    const data = await res.json();
    setUploadingVideo(false);
    if (data.video) {
      setMediaVideos((prev) => [...prev, data.video]);
      setVideoUrl("");
      setUploadMsg("视频已添加");
    } else {
      await handleUploadError(data);
    }
  }

  async function submitClaim() {
    const res = await fetch("/api/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entityId: entity.id,
        claimType: entity.type === "city" ? "city" : entity.type === "person" ? "person" : "company",
        ...claimForm,
      }),
    });
    const data = await res.json();
    setClaimMsg(data.success ? "认领申请已提交，我们将尽快审核。" : data.error || "提交失败");
  }

  async function startEntityUpdate() {
    setUpdatingEntity(true);
    setUpdateMsg("");
    setUpdateJob(null);
    try {
      const res = await fetch("/api/entities/generate/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: entity.name,
          entityType: entity.type,
          generateReport: true,
          fetchNews: true,
          visibility: entity.visibility === "private" ? "private" : "public",
          forceUpdate: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "更新失败");
      setUpdateJob({ jobId: data.jobId, itemId: data.itemId });
    } catch (error) {
      setUpdatingEntity(false);
      setUpdateMsg(error instanceof Error ? error.message : "更新失败");
    }
  }

  async function submitContact(source: "exchange_card" | "online_chat") {
    const message = source === "online_chat" ? chatText.trim() : exchangeForm.message.trim();
    if (source === "online_chat" && !message) {
      setContactMsg("请先输入想咨询的问题。");
      return;
    }
    if (source === "exchange_card" && !exchangeForm.visitorName.trim() && !exchangeForm.visitorPhone.trim() && !exchangeForm.visitorWechat.trim()) {
      setContactMsg("请至少留下姓名、手机或微信中的一项。");
      return;
    }
    setSubmittingContact(true);
    setContactMsg("");
    try {
      const res = await authFetch(`/api/entities/${entity.slug}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...exchangeForm,
          message,
          source,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "提交失败");
      setContactMsg(data.message || (source === "online_chat" ? "消息已发送。" : "名片交换请求已提交。"));
      if (source === "online_chat") setChatText("");
      if (source === "exchange_card") {
        setExchangeForm({ visitorName: "", visitorPhone: "", visitorWechat: "", message: "" });
      }
    } catch (error) {
      setContactMsg(error instanceof Error ? error.message : "提交失败");
    } finally {
      setSubmittingContact(false);
    }
  }

  return (
    <div className={`min-h-screen ${theme.card} ${theme.text}`}>
      {/* Hero */}
      <header className={`relative overflow-hidden ${theme.cover}`}>
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-16 right-0 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl" />
          {isCity && (
            <div
              className="absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.8) 1px, transparent 1px)",
                backgroundSize: "48px 48px",
              }}
            />
          )}
        </div>

        <div className="relative mx-auto max-w-5xl px-5 pb-16 pt-6 sm:px-8 sm:pb-20 sm:pt-10">
          {(heroCoverUrl) && (
            <div className="mb-6 overflow-hidden rounded-2xl border border-white/20 shadow-2xl">
              <img
                src={resolveAssetUrl(heroCoverUrl)}
                alt={entity.name}
                className="aspect-[21/9] w-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          )}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white/90 backdrop-blur-sm">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-200" />
            <span className="line-clamp-1">{disclaimer}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
              {typeLabel}
            </span>
            {subtypeLabel && (
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">{subtypeLabel}</span>
            )}
            {entity.isVerified && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/25 px-3 py-1 text-xs text-emerald-100">
                <Shield className="h-3 w-3" /> 已认证
              </span>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl">
              {entity.profile?.title || entity.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              {canEditPage && (
                <button
                  type="button"
                  onClick={openPageEditor}
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-amber-50"
                >
                  <Shield className="h-4 w-4" />
                  编辑页面
                </button>
              )}
              <button
                type="button"
                onClick={startEntityUpdate}
                disabled={updatingEntity}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/12 px-4 py-2 text-sm font-semibold text-white backdrop-blur hover:bg-white/18 disabled:opacity-60"
              >
                {updatingEntity ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                一键更新
              </button>
              <EntityLikeButton slug={entity.slug} initialCount={entity.likeCount ?? 0} />
            </div>
          </div>
          {entity.profile?.subtitle && (
            <p className="mt-2 text-base text-white/75">{entity.profile.subtitle}</p>
          )}
          {entity.profile?.slogan && (
            <p className={`mt-6 max-w-2xl border-l-2 pl-4 text-lg font-medium leading-relaxed ${theme.heroBorder} ${theme.accentText}`}>
              {entity.profile.slogan}
            </p>
          )}
          {entity.profile?.summary && (
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/70 sm:text-base">
              {entity.profile.summary}
            </p>
          )}

          {content.tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {content.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/15 bg-black/10 px-3 py-1 text-xs text-white/85 backdrop-blur-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 pb-36 pt-6 sm:px-6">
        {(updateJob || updateMsg) && (
          <section className={`-mt-12 rounded-2xl border bg-white p-5 shadow-xl sm:p-6 ${theme.border}`}>
            <h2 className="text-lg font-bold text-slate-900">正在按最新公开资料更新「{entity.name}」</h2>
            <p className="mt-1 text-sm text-slate-500">同名品牌会更新当前页面，不重复生成新页面。</p>
            {updateJob && (
              <GenerationProgressPanel
                jobId={updateJob.jobId}
                itemId={updateJob.itemId}
                active={updatingEntity}
                onComplete={() => {
                  setUpdatingEntity(false);
                  setUpdateJob(null);
                  setUpdateMsg("更新完成，刷新后可查看最新文本、图片和评分。");
                  window.location.reload();
                }}
                onDisambiguation={(payload) => {
                  setUpdatingEntity(false);
                  setUpdateJob(null);
                  setUpdateMsg(`需要确认身份：${payload.name}`);
                }}
                onError={(msg) => {
                  setUpdatingEntity(false);
                  setUpdateJob(null);
                  setUpdateMsg(msg);
                }}
                onIdle={() => setUpdatingEntity(false)}
              />
            )}
            {updateMsg && <p className="mt-3 text-sm text-slate-600">{updateMsg}</p>}
          </section>
        )}

        {/* 尚未生成 18 步报告 */}
        {!latestReport && (
          <section className={`-mt-12 rounded-2xl border bg-white p-5 shadow-xl sm:p-6 ${theme.border}`}>
            <p className={`text-xs font-semibold uppercase tracking-widest ${theme.scoreAccent}`}>
              降龙18掌
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">18 步品牌复盘报告</h2>
            <p className="mt-2 text-sm text-slate-500">
              按降龙18掌一次性生成 18 步文字报告（每步独立提示词）。已有档案可直接生成，无需重新创建。
            </p>
            <div className="mt-4 max-w-md">
              <GenerateReportButton
                slug={entity.slug}
                entityType={entity.type}
                entityName={entity.name}
                label="生成 18 步报告"
              />
            </div>
            <Link
              href="/xianglong18"
              className={`mt-3 inline-flex items-center gap-1 text-sm ${theme.link} ${theme.linkHover}`}
            >
              了解降龙18掌方法论
              <ChevronRight className="h-4 w-4" />
            </Link>
          </section>
        )}

        {/* Score dashboard */}
        {latestReport && Object.keys(reportScores).length > 0 && (
          <section className={`-mt-12 rounded-2xl border bg-white p-5 shadow-xl sm:p-6 ${theme.border}`}>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className={`text-xs font-semibold uppercase tracking-widest ${theme.scoreAccent}`}>Brand Score</p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">品牌与传播评分</h2>
                <p className="mt-1 text-sm text-slate-500">基于公开资料与品牌复盘模型综合评估</p>
              </div>
              <ScoreRing score={overallScore} accentClass={theme.scoreAccent} />
            </div>
            <div className="mt-6">
              <ScoreGrid scores={reportScores} accentClass={theme.scoreAccent} />
            </div>
            <Link
              href={reportPath(entity.type, entity.slug)}
              className={`mt-5 inline-flex items-center gap-1 text-sm font-medium ${theme.link} ${theme.linkHover}`}
            >
              查看完整 18 步品牌复盘报告
              <ChevronRight className="h-4 w-4" />
            </Link>
          </section>
        )}

        {isCompanyCard && canEditPage && !showPublicContact && (
          <section className={`-mt-12 rounded-2xl border border-dashed border-orange-200 bg-orange-50/40 p-5 sm:p-6 ${theme.border}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">补充企业联系电话</h2>
                <p className="mt-1 text-sm text-slate-600">
                  可在「编辑页面」中添加公司电话、邮箱与地址，访客即可直接联系并交换名片。
                </p>
              </div>
              <button
                type="button"
                onClick={openPageEditor}
                className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
              >
                <Phone className="h-4 w-4" />
                添加联系方式
              </button>
            </div>
          </section>
        )}

        {showPublicContact && (
          <section className={`-mt-12 rounded-2xl border bg-white p-5 shadow-sm sm:p-6 ${theme.border}`}>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className={`text-xs font-semibold uppercase tracking-widest ${theme.scoreAccent}`}>Business Card</p>
                <h2 className="text-xl font-bold text-slate-900">企业名片联系方式</h2>
                <p className="mt-1 text-sm text-slate-500">
                  认证后可补充电话、邮箱与地址，便于访客直接联系与名片交换。
                </p>
              </div>
              {canEditPage && (
                <button
                  type="button"
                  onClick={openPageEditor}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-orange-300 hover:text-orange-600"
                >
                  编辑联系方式
                </button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {publicContact.phone && (
                <a
                  href={`tel:${publicContact.phone}`}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-800 transition hover:border-orange-200 hover:bg-orange-50/60"
                >
                  <Phone className={`h-4 w-4 shrink-0 ${theme.iconText}`} />
                  <span>
                    <span className="block text-xs text-slate-500">联系电话</span>
                    <span className="font-semibold">{publicContact.phone}</span>
                  </span>
                </a>
              )}
              {publicContact.email && (
                <a
                  href={`mailto:${publicContact.email}`}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-800 transition hover:border-orange-200 hover:bg-orange-50/60"
                >
                  <Mail className={`h-4 w-4 shrink-0 ${theme.iconText}`} />
                  <span>
                    <span className="block text-xs text-slate-500">邮箱</span>
                    <span className="font-semibold break-all">{publicContact.email}</span>
                  </span>
                </a>
              )}
              {publicContact.wechat && (
                <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-800">
                  <MessageCircle className={`h-4 w-4 shrink-0 ${theme.iconText}`} />
                  <span>
                    <span className="block text-xs text-slate-500">微信</span>
                    <span className="font-semibold">{publicContact.wechat}</span>
                  </span>
                </div>
              )}
              {publicContact.address && (
                <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-800 sm:col-span-2">
                  <MapPin className={`h-4 w-4 shrink-0 ${theme.iconText}`} />
                  <span>
                    <span className="block text-xs text-slate-500">地址</span>
                    <span className="font-semibold">{publicContact.address}</span>
                  </span>
                </div>
              )}
            </div>
          </section>
        )}

        <section id="entity-contact" className={`rounded-2xl border bg-white p-5 shadow-sm sm:p-6 ${theme.border}`}>
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className={`text-xs font-semibold uppercase tracking-widest ${theme.scoreAccent}`}>Contact</p>
              <h2 className="text-xl font-bold text-slate-900">交换名片 / 线上聊天</h2>
              <p className="mt-1 text-sm text-slate-500">
                交换名片需对方在「名片夹」同意后，双方才可互看完整联系方式；留言将同步进入对方收件箱。
              </p>
            </div>
            <div className="flex gap-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
                <Phone className="h-3.5 w-3.5" />
                手机
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
                <MessageCircle className="h-3.5 w-3.5" />
                留言
              </span>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${theme.iconBg} ${theme.iconText}`}>
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">交换名片</h3>
                  <p className="text-xs text-slate-500">适合合作、采访、活动邀请和品牌咨询。</p>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  placeholder="您的姓名"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-300"
                  value={exchangeForm.visitorName}
                  onChange={(e) => setExchangeForm({ ...exchangeForm, visitorName: e.target.value })}
                />
                <input
                  placeholder="手机号"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-300"
                  value={exchangeForm.visitorPhone}
                  onChange={(e) => setExchangeForm({ ...exchangeForm, visitorPhone: e.target.value })}
                />
              </div>
              <input
                placeholder="微信号或邮箱"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-300"
                value={exchangeForm.visitorWechat}
                onChange={(e) => setExchangeForm({ ...exchangeForm, visitorWechat: e.target.value })}
              />
              <textarea
                placeholder="留言（选填）"
                rows={3}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-300"
                value={exchangeForm.message}
                onChange={(e) => setExchangeForm({ ...exchangeForm, message: e.target.value })}
              />
              <button
                type="button"
                disabled={submittingContact}
                onClick={() => submitContact("exchange_card")}
                className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${theme.button} ${theme.buttonText} disabled:opacity-60`}
              >
                {submittingContact ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                交换名片
              </button>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-sky-50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${theme.iconBg} ${theme.iconText}`}>
                  <MessageCircle className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">线上聊天</h3>
                  <p className="text-xs text-slate-500">先发一条问题，后续可升级为实时客服或微信承接。</p>
                </div>
              </div>
              <div className="rounded-2xl bg-white p-3 shadow-sm">
                <p className="inline-flex max-w-[85%] rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-700">
                  您好，这里是{entity.name}的品牌名片页，请直接留下想咨询的问题。
                </p>
                <div className="mt-3 flex items-end gap-2">
                  <textarea
                    placeholder="输入咨询内容"
                    rows={4}
                    className="min-h-[116px] flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-300"
                    value={chatText}
                    onChange={(e) => setChatText(e.target.value)}
                  />
                  <button
                    type="button"
                    disabled={submittingContact}
                    onClick={() => submitContact("online_chat")}
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${theme.button} ${theme.buttonText} disabled:opacity-60`}
                    aria-label="发送"
                  >
                    {submittingContact ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
          {contactMsg && (
            <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">{contactMsg}</p>
          )}
        </section>

        {/* Sections grid */}
        {displaySections.length > 0 && (
          <section>
            <div className="mb-4 flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Profile</p>
                <h2 className="text-xl font-bold text-slate-900">核心档案</h2>
              </div>
              <span className="text-xs text-slate-400">{displaySections.length} 个模块</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {displaySections.map((section, i) => {
                const Icon = SECTION_ICONS[section.type] || Sparkles;
                return (
                  <article
                    key={i}
                    className={`group rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${theme.border}`}
                  >
                    <div className="mb-3 flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${theme.iconBg} ${theme.iconText}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="font-semibold text-slate-900">{section.title}</h3>
                    </div>
                    <p className="text-sm leading-7 text-slate-600">{section.content}</p>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* 品牌相关图片（按名称自动搜图 + 已入库相册） */}
        {showBrandImages && (
          <BrandImageGallery
            brandName={entity.name}
            entitySlug={entity.slug}
            savedImages={mediaImages.filter((m) => m.type !== "cover")}
            initialDiscovered={discoveredBrandImages}
            themeBorder={theme.border}
            themeIconText={theme.iconText}
          />
        )}

        {mediaVideos.length > 0 && (
          <section className={`rounded-2xl border bg-white p-5 shadow-sm ${theme.border}`}>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
              <Video className={`h-5 w-5 ${theme.iconText}`} />
              相关视频
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {mediaVideos.map((video) => (
                <VideoPreviewCard
                  key={video.id}
                  platform={video.platform}
                  url={video.url}
                  title={video.title || "视频"}
                  coverUrl={video.coverUrl}
                  embedUrl={video.embedUrl}
                  canEmbed={video.canEmbed}
                />
              ))}
            </div>
          </section>
        )}

        {adSlot?.enabled !== false && (
        <section className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${theme.border}`}>
          <div className="grid gap-0 md:grid-cols-[1.2fr_0.8fr]">
            <div className="p-6">
              <p className={`mb-2 text-xs font-bold uppercase tracking-[0.18em] ${theme.iconText}`}>
                {adSlot?.eyebrow || "推荐品牌"}
              </p>
              <h2 className="text-xl font-black text-slate-950">{adSlot?.title || "深圳市了不起品牌管理有限公司"}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {adSlot?.description || "专注品牌创新案例研究、品牌名片建设、正向传播与企业品牌增长服务。"}
              </p>
              {adSlot?.href && adSlot.href !== "#" && (
                <a
                  href={adSlot.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-4 inline-flex items-center gap-1 rounded-xl px-4 py-2 text-sm font-semibold ${theme.button} ${theme.buttonText}`}
                >
                  {adSlot.ctaLabel || "了解更多"}
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
            <div className="flex min-h-[190px] items-center justify-center bg-gradient-to-br from-orange-100 via-sky-100 to-white p-6">
              {adSlot?.imageUrl ? (
                <img
                  src={resolveAssetUrl(adSlot.imageUrl)}
                  alt={adSlot.title}
                  className="max-h-[180px] w-full rounded-2xl object-cover shadow-sm"
                />
              ) : (
                <div className="rounded-2xl bg-white/85 px-5 py-4 text-center shadow-sm">
                  <Sparkles className={`mx-auto mb-2 h-7 w-7 ${theme.iconText}`} />
                  <p className="text-sm font-bold text-slate-900">深圳市了不起品牌管理有限公司</p>
                  <p className="mt-1 text-xs text-slate-500">管理员可配置广告素材</p>
                </div>
              )}
            </div>
          </div>
        </section>
        )}

        {/* News + Related row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {displayNews.length > 0 && (
            <section className={`rounded-2xl border bg-white p-5 shadow-sm ${theme.border}`}>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
                <Newspaper className={`h-5 w-5 ${theme.iconText}`} />
                相关报道
              </h2>
              <div className="space-y-3">
                {displayNews.slice(0, 5).map((article) => (
                  <a
                    key={article.id}
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`group block rounded-xl border border-slate-100 bg-white/60 p-3 transition ${theme.hoverBorder} ${theme.hoverBg}`}
                  >
                    <p className={`text-sm font-medium text-slate-800 ${theme.linkHover}`}>
                      {article.title}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-400">
                      <span>{article.source || "新闻"}</span>
                      <ExternalLink className="h-3 w-3" />
                    </div>
                  </a>
                ))}
              </div>
            </section>
          )}

          {related.length > 0 && (
            <section className={`rounded-2xl border bg-white p-5 shadow-sm ${theme.border}`}>
              <h2 className="mb-4 text-lg font-bold text-slate-900">关联图谱</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {related.map((rel) => (
                  <Link
                    key={rel.id}
                    href={entityPath(rel.type, rel.slug)}
                    className={`rounded-xl border border-slate-100 bg-white/60 p-3 transition ${theme.hoverBorder} ${theme.hoverBg}`}
                  >
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{rel.rel}</p>
                    <p className="mt-1 font-semibold text-slate-800">{rel.name}</p>
                    {rel.profile?.slogan && (
                      <p className="mt-1 line-clamp-1 text-xs text-slate-500">{rel.profile.slogan}</p>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sources */}
        {displaySources.length > 0 && (
          <section className={`rounded-2xl border border-dashed bg-white/60 p-5 ${theme.border}`}>
            <h2 className="mb-3 text-sm font-semibold text-slate-500">
              权威资料来源 · {displaySources.length}
            </h2>
            <ul className="space-y-2">
              {displaySources.slice(0, 5).map((src) => (
                <li key={src.id}>
                  {src.url ? (
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2 text-sm text-slate-700 transition ${theme.hoverBorder} ${theme.linkHover}`}
                    >
                      <span className="truncate">{formatSourceLabel(src.title, 36)}</span>
                      <span className="shrink-0 text-[11px] text-slate-400">
                        {src.sourceType === "wiki" ? "百科" : src.sourceType === "official" ? "官网" : "网页"}
                      </span>
                    </a>
                  ) : (
                    <span className="block rounded-xl border border-slate-100 bg-white px-3 py-2 text-sm text-slate-600">
                      {formatSourceLabel(src.title, 36)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      {/* Bottom bar */}
      <div className={`fixed bottom-0 left-0 right-0 z-50 border-t bg-white/90 backdrop-blur-xl ${theme.border}`}>
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => setShowClaim(true)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold shadow-lg ${theme.button} ${theme.buttonText}`}
          >
            <Upload className="h-4 w-4" />
            认领 / 上传
          </button>
          <a
            href="#entity-contact"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <MessageCircle className="h-4 w-4" />
            交换名片
          </a>
          {latestReport ? (
            <Link
              href={reportPath(entity.type, entity.slug)}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <FileText className="h-4 w-4" />
              品牌报告
            </Link>
          ) : (
            <Link
              href={`/report/generate?name=${encodeURIComponent(entity.name)}&entityType=${encodeURIComponent(entity.type)}`}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <FileText className="h-4 w-4" />
              生成报告
            </Link>
          )}
          <button
            type="button"
            onClick={startEntityUpdate}
            disabled={updatingEntity}
            className="hidden flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 sm:flex"
          >
            {updatingEntity ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            一键更新
          </button>
        </div>
      </div>

      {showEditor && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl">
            <div className="flex items-center justify-between gap-4 border-b px-5 py-4">
              <div>
                <h3 className="text-lg font-semibold">编辑品牌页面</h3>
                <p className="text-xs text-slate-500">管理员和被授权编辑者可修改；每次保存都会进入历史记录。</p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditor(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border text-xl text-slate-500 hover:bg-slate-50"
                aria-label="关闭"
              >
                ×
              </button>
            </div>
            <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-5 lg:grid-cols-[1.2fr_0.8fr]">
              <section className="space-y-3 rounded-xl border bg-slate-50 p-4">
                {([
                  ["name", "页面名称"],
                  ["title", "主标题"],
                  ["subtitle", "副标题"],
                  ["slogan", "品牌口号"],
                ] as const).map(([key, label]) => (
                  <label key={key} className="block text-xs font-semibold text-slate-500">
                    {label}
                    <input
                      value={editDraft[key]}
                      onChange={(event) => setEditDraft((prev) => ({ ...prev, [key]: event.target.value }))}
                      className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-orange-400"
                    />
                  </label>
                ))}
                <label className="block text-xs font-semibold text-slate-500">
                  简介
                  <textarea
                    value={editDraft.summary}
                    onChange={(event) => setEditDraft((prev) => ({ ...prev, summary: event.target.value }))}
                    className="mt-1 min-h-28 w-full rounded-xl border bg-white px-3 py-2 text-sm leading-6 text-slate-900 outline-none focus:border-orange-400"
                  />
                </label>
                {(entity.type === "company" || entity.type === "brand") && (
                  <div className="rounded-xl border border-orange-100 bg-orange-50/50 p-4">
                    <p className="text-sm font-semibold text-slate-900">企业名片联系方式</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      填写后将展示在企业名片页，便于访客直接拨打或联系。请确保信息真实，并配合认证材料使用。
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {(
                        [
                          ["phone", "联系电话（可公开）"],
                          ["email", "邮箱"],
                          ["wechat", "微信"],
                          ["address", "公司地址"],
                        ] as const
                      ).map(([key, label]) => (
                        <label
                          key={key}
                          className={`block text-xs font-semibold text-slate-500 ${key === "address" ? "sm:col-span-2" : ""}`}
                        >
                          {label}
                          <input
                            value={editDraft.contact[key] || ""}
                            onChange={(event) =>
                              setEditDraft((prev) => ({
                                ...prev,
                                contact: { ...prev.contact, [key]: event.target.value },
                              }))
                            }
                            placeholder={key === "phone" ? "例如：0755-88888888 或 13800138000" : ""}
                            className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-orange-400"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                <label className="block text-xs font-semibold text-slate-500">
                  页面内容 JSON
                  <textarea
                    value={editDraft.contentJson}
                    onChange={(event) => setEditDraft((prev) => ({ ...prev, contentJson: event.target.value }))}
                    className="mt-1 min-h-52 w-full rounded-xl border bg-white px-3 py-2 font-mono text-xs leading-5 text-slate-900 outline-none focus:border-orange-400"
                  />
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={savePageEdit}
                    disabled={savingEditor}
                    className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {savingEditor ? "保存中..." : "保存页面"}
                  </button>
                  {editorMsg && <span className="text-sm text-slate-600">{editorMsg}</span>}
                </div>
              </section>
              <aside className="space-y-4">
                <section className="rounded-xl border p-4">
                  <h4 className="font-semibold">授权名单</h4>
                  <div className="mt-3 flex gap-2">
                    <input
                      value={grantName}
                      onChange={(event) => setGrantName(event.target.value)}
                      placeholder="用户名 / 邮箱 / 手机"
                      className="min-w-0 flex-1 rounded-xl border px-3 py-2 text-sm"
                    />
                    <button type="button" onClick={grantEditor} className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white">
                      授权
                    </button>
                  </div>
                  <ul className="mt-3 max-h-44 space-y-2 overflow-y-auto text-sm">
                    {editors.map((item, index) => {
                      const u = (item.user || item) as Record<string, unknown>;
                      return (
                        <li key={String(item.id || u.id || index)} className="rounded-lg bg-slate-50 px-3 py-2">
                          <b>{String(u.displayName || u.unifiedUsername || u.email || u.phone || "用户")}</b>
                          <span className="ml-2 text-xs text-slate-500">{item.owner ? "拥有者" : String(item.role || "editor")}</span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
                <section className="rounded-xl border p-4">
                  <h4 className="font-semibold">编辑历史</h4>
                  <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto text-xs text-slate-600">
                    {revisions.map((revision) => {
                      const u = revision.user as Record<string, unknown> | null;
                      return (
                        <li key={String(revision.id)} className="rounded-lg bg-slate-50 px-3 py-2">
                          <div className="font-semibold text-slate-900">{String(revision.action)}</div>
                          <div>{String(revision.note || "")}</div>
                          <div className="mt-1 text-slate-400">
                            {String(u?.displayName || u?.unifiedUsername || "系统")} · {new Date(String(revision.createdAt)).toLocaleString()}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              </aside>
            </div>
          </div>
        </div>
      )}

      {showClaim && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6">
          <div className="relative flex h-[86vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl">
            <button
              type="button"
              onClick={() => { setShowClaim(false); setClaimMsg(""); }}
              className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-lg leading-none text-slate-500 shadow-sm hover:bg-slate-50"
              aria-label="关闭"
            >
              ×
            </button>
            <div className="shrink-0 border-b border-slate-100 px-5 py-4 pr-16">
            <h3 className="text-lg font-semibold">认领 / 补充资料</h3>
            <p className="mt-1 text-xs text-slate-500">
              可上传图片、添加视频链接（B站/YouTube/腾讯视频等），认领后管理员审核可见
            </p>

            </div>
            <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="max-h-full space-y-4 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-700">品牌 IP 图（Fenno AI）</p>
                <button
                  type="button"
                  onClick={generateIpImage}
                  disabled={generatingIpImage}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-white ${theme.button}`}
                >
                  {generatingIpImage ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  {brandUpgrade ? "生成 IP 图" : "升级后生成"}
                </button>
              </div>
              <p className="text-xs text-slate-500">
                首张图片免费上传；多图上传与 AI 生图需登录并开通品牌升级（¥500）。
              </p>
              <p className="text-sm font-medium text-slate-700">上传图片</p>
              <ImageSearchPanel
                defaultQuery={entity.name}
                entityType={mapSearchEntityType(entity.type)}
                compact
                selectLabel="加入相册"
                onSelect={(url) => attachImageUrl(url)}
              />
              <ImageUploader
                label="相册图片"
                aspect="wide"
                entitySlug={entity.slug}
                onChange={(url) => {
                  setMediaImages((prev) => [
                    ...prev,
                    { id: `local-${Date.now()}`, url, type: "gallery", title: "用户上传" },
                  ]);
                  setUploadMsg("图片已上传");
                }}
                hint="jpg/png/webp，单张 ≤5MB"
              />
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">添加视频链接</p>
                <div className="flex gap-2">
                  <input
                    placeholder="粘贴 B站 / YouTube / 腾讯视频链接"
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={addVideo}
                    disabled={uploadingVideo}
                    className={`rounded-xl px-4 py-2.5 text-sm font-medium text-white ${theme.button}`}
                  >
                    {uploadingVideo ? <Loader2 className="h-4 w-4 animate-spin" /> : "添加"}
                  </button>
                </div>
              </div>
              {uploadMsg && (
                <p className={`text-xs ${uploadMsg.includes("失败") || uploadMsg.includes("需") ? "text-amber-600" : "text-green-600"}`}>
                  {uploadMsg}
                </p>
              )}
            </div>

            <div className="max-h-full overflow-y-auto rounded-xl border border-slate-100 bg-white p-4">
            {claimMsg ? (
              <p className="py-6 text-center text-green-600">{claimMsg}</p>
            ) : (
              <div className="space-y-3">
                <p className="text-xs font-medium text-slate-500">认领申请（可选）</p>
                <p className="text-xs text-slate-400">{AI_DISCLAIMER}</p>
                <input
                  placeholder="您的姓名"
                  className={`w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 ${theme.border}`}
                  value={claimForm.contactName}
                  onChange={(e) => setClaimForm({ ...claimForm, contactName: e.target.value })}
                />
                <input
                  placeholder="联系电话"
                  className={`w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 ${theme.border}`}
                  value={claimForm.contactPhone}
                  onChange={(e) => setClaimForm({ ...claimForm, contactPhone: e.target.value })}
                />
                <textarea
                  placeholder="请说明认领理由或纠错内容"
                  rows={4}
                  className={`w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 ${theme.border}`}
                  value={claimForm.proofText}
                  onChange={(e) => setClaimForm({ ...claimForm, proofText: e.target.value })}
                />
                <button
                  type="button"
                  onClick={submitClaim}
                  className={`w-full rounded-xl py-3 text-sm font-semibold ${theme.button} ${theme.buttonText}`}
                >
                  提交申请
                </button>
              </div>
            )}
            </div>
            </div>
            <button
              type="button"
              onClick={() => { setShowClaim(false); setClaimMsg(""); }}
              className="border-t border-slate-100 py-3 text-sm text-slate-500 hover:bg-slate-50"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
