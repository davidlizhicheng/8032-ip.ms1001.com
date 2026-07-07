"use client";

import { useEffect, useState } from "react";
import { Sparkles, Loader2, Plus, Trash2, Globe, ExternalLink, FileText, ShieldCheck } from "lucide-react";
import { authFetch, parseJsonResponse } from "@/lib/auth/client";
import { GenerationProgressPanel } from "@/components/report/GenerationProgressPanel";
import { ImageUploader } from "@/components/ui/ImageUploader";
import { ImageSearchPanel } from "@/components/media/ImageSearchPanel";
import { VideoPreviewCard } from "@/components/ui/VideoPreviewCard";
import { PersonDisambiguationPanel } from "@/components/person/PersonDisambiguationPanel";
import { resolveAssetUrl } from "@/lib/storage/public-url";
import { THEMES } from "@/lib/themes";
import type { ParsedCardInfo, CardTheme } from "@/lib/schemas/card";
import type { VideoPreview } from "@/lib/schemas/card";
import {
  CLAIM_LARGE_COMPANY_HINT,
  CLAIM_PERSONAL_COMMITMENT_TEXT,
  CLAIM_SMALL_COMPANY_HINT,
  CLAIM_WEBSITE_DISCLAIMER,
  CARD_FIRST_PUBLISH_HINT,
} from "@/lib/config/claim-verification";

const SAMPLE_TEXT = "陈行甲 公益人物 个人品牌报告";

type VideoItem = VideoPreview & { id: string };

type PersonCandidate = {
  id: string;
  label: string;
  title?: string;
  company?: string;
  snippet: string;
  url?: string;
  region?: string;
  source?: string;
  summary?: string;
  confidence?: number;
};

type ComparisonResult = {
  title: string;
  summary: string;
  long_content: string;
  sections: Array<{ title: string; content: string }>;
  candidates: Array<{ id: string; label: string; region: string }>;
};

export function CardCreateForm() {
  const [rawText, setRawText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [parsed, setParsed] = useState(false);
  const [enrichFromWeb, setEnrichFromWeb] = useState(false);
  const [sourcesUsed, setSourcesUsed] = useState(0);
  const [researchSteps, setResearchSteps] = useState<
    Array<{ label: string; url?: string; status: string; detail?: string }>
  >([]);
  const [disambiguation, setDisambiguation] = useState<{
    name: string;
    reason: string;
    candidates: PersonCandidate[];
    allowCompare?: boolean;
  } | null>(null);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [generateBrandReport, setGenerateBrandReport] = useState(true);
  const [confirmedCandidateId, setConfirmedCandidateId] = useState<string | undefined>();
  const [reportGenerating, setReportGenerating] = useState(false);
  const [reportStatus, setReportStatus] = useState("");
  const [reportJob, setReportJob] = useState<{
    jobId: string;
    itemId: string;
    cardSlug: string;
  } | null>(null);
  const [pendingReportCardSlug, setPendingReportCardSlug] = useState<string | null>(null);
  const [generationResult, setGenerationResult] = useState<{
    cardHref: string;
    entityHref?: string;
    reportHref?: string;
    meHref: string;
  } | null>(null);

  const [form, setForm] = useState({
    name: "",
    title: "",
    company: "",
    brandSlogan: "",
    bio: "",
    longBio: "",
    phone: "",
    email: "",
    wechat: "",
    address: "",
    logoUrl: "",
    exchangeEnabled: true,
    verificationMethod: "frontdesk_photos",
    verificationAccount: "",
    companySize: "small" as "large" | "small",
    personalCommitment: false,
    disclaimerAccepted: false,
    theme: "brand_orange" as CardTheme,
    avatarUrl: "",
    coverUrl: "",
    services: [] as string[],
    experiences: [] as Array<{ title: string; content: string }>,
    honors: [] as Array<{ title: string; content: string }>,
    cases: [] as Array<{ title: string; content: string }>,
    profileSections: [] as Array<{ type: string; title: string; content: string }>,
  });

  const [galleryImages, setGalleryImages] = useState<
    Array<{ url: string; type: string; title?: string }>
  >([]);
  const [proofImages, setProofImages] = useState<
    Array<{ url: string; type: string; title?: string }>
  >([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoLoading, setVideoLoading] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (params.get("web") === "1" || params.get("mode") === "web") {
        setEnrichFromWeb(true);
      }
      const report = params.get("report");
      if (report === "0" || params.get("mode") === "card") {
        setGenerateBrandReport(false);
      } else if (report === "1" || params.get("mode") === "both") {
        setGenerateBrandReport(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const minPasteLength = enrichFromWeb ? 2 : 10;

  async function handleParse(confirmedCandidateId?: string, compareMode = false) {
    const pendingDisambiguation = disambiguation;
    setParsing(true);
    setError("");
    if (!compareMode) setDisambiguation(null);
    setComparison(null);
    setGenerationResult(null);
    setResearchSteps([]);
    try {
      const res = await fetch("/api/ai/parse-card-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawText,
          enrichFromWeb,
          confirmedCandidateId,
          compareMode,
          compareCandidateIds: compareMode
            ? pendingDisambiguation?.candidates.slice(0, 2).map((c) => c.id)
            : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "解析失败");

      if (data.status === "needs_confirmation") {
        setDisambiguation({
          name: data.name,
          reason: data.reason,
          candidates: data.candidates,
          allowCompare: data.allowCompare,
        });
        return;
      }

      if (data.status === "comparison") {
        setDisambiguation(null);
        setComparison(data.comparison);
        setParsed(true);
        setForm((prev) => ({
          ...prev,
          name: data.name,
          bio: data.comparison.summary,
          longBio: data.comparison.long_content,
          profileSections: (data.comparison.sections || []).map(
            (s: { title: string; content: string }, i: number) => ({
              type: `compare_${i}`,
              title: s.title,
              content: s.content,
            }),
          ),
        }));
        return;
      }

      applyParsedResult(data);
      setSourcesUsed(data.sourcesUsed || 0);
      setResearchSteps(data.researchSteps || []);
      setParsed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "解析失败");
    } finally {
      setParsing(false);
    }
  }

  function applyParsedResult(
    result: ParsedCardInfo & {
      sourcesUsed?: number;
      famousMedia?: {
        avatarUrl?: string;
        coverUrl?: string;
        galleryImages?: Array<{ url: string; type: string; title?: string }>;
        videos?: Array<{
          platform: string;
          url: string;
          title?: string;
          coverUrl?: string;
          embedUrl?: string;
          canEmbed: boolean;
        }>;
        source?: string;
      } | null;
    },
  ) {
    setForm({
      name: result.name,
      title: result.title,
      company: result.company,
      brandSlogan: result.brand_slogan,
      bio: result.bio,
      longBio: result.long_bio || "",
      phone: result.phone,
      email: result.email,
      wechat: result.wechat,
      address: result.address,
      logoUrl: "",
      exchangeEnabled: true,
      verificationMethod: "frontdesk_photos",
      verificationAccount: "",
      companySize: "small",
      personalCommitment: false,
      disclaimerAccepted: false,
      theme: result.suggested_theme,
      avatarUrl: result.famousMedia?.avatarUrl || "",
      coverUrl: result.famousMedia?.coverUrl || "",
      services: result.services,
      experiences: result.experiences,
      honors: result.honors,
      cases: result.cases,
      profileSections: result.profile_sections || [],
    });

    if (result.famousMedia?.galleryImages?.length) {
      setGalleryImages(result.famousMedia.galleryImages);
    }
    if (result.famousMedia?.videos?.length) {
      setVideos(
        result.famousMedia.videos.map((v, i) => ({
          platform: v.platform,
          url: v.url,
          title: v.title || "相关视频",
          cover_url: v.coverUrl || "",
          embed_url: v.embedUrl || "",
          can_embed: v.canEmbed,
          id: `famous-${i}-${Date.now()}`,
        })),
      );
    }
  }

  function confirmCandidate(id: string) {
    setConfirmedCandidateId(id);
    setDisambiguation(null);
    if (pendingReportCardSlug) {
      void startBrandReport(pendingReportCardSlug, id);
      return;
    }
    handleParse(id, false);
  }

  async function startBrandReport(cardSlug: string, candidateId?: string) {
    setReportGenerating(true);
    setError("");
    setReportJob(null);
    setPendingReportCardSlug(cardSlug);
    try {
      const startRes = await authFetch("/api/entities/generate/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          entityType: "person",
          generateReport: true,
          fetchNews: enrichFromWeb,
          confirmedCandidateId: candidateId ?? confirmedCandidateId,
          forUser: true,
        }),
      });
      const startData = await parseJsonResponse<{
        jobId: string;
        itemId: string;
        existing?: boolean;
        message?: string;
        entityHref?: string;
        reportHref?: string;
        error?: string;
      }>(startRes);
      if (!startRes.ok) throw new Error(startData.error || "品牌报告启动失败");
      if (startData.existing) {
        setReportGenerating(false);
        setReportJob(null);
        setGenerationResult({
          cardHref: `/u/${cardSlug}`,
          entityHref: startData.entityHref,
          reportHref: startData.reportHref,
          meHref: `/me?${new URLSearchParams({
            created: cardSlug,
            report: startData.reportHref || "",
          }).toString()}`,
        });
        return;
      }
      setReportJob({
        jobId: startData.jobId,
        itemId: startData.itemId,
        cardSlug,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "品牌报告启动失败");
      setReportGenerating(false);
    }
  }

  function handleCompare() {
    handleParse(undefined, true);
  }

  async function handleAddVideo() {
    if (!videoUrl.trim()) return;
    setVideoLoading(true);
    try {
      const res = await fetch("/api/video/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: videoUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "视频解析失败");
      setVideos((prev) => [
        ...prev,
        { ...data, id: `${Date.now()}-${prev.length}` },
      ]);
      setVideoUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "视频解析失败");
    } finally {
      setVideoLoading(false);
    }
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setError("请填写姓名");
      return;
    }
    if (!form.personalCommitment) {
      setError("请勾选个人承诺");
      return;
    }
    if (!form.disclaimerAccepted) {
      setError("请阅读并同意网站免责申明");
      return;
    }
    if (form.companySize === "large") {
      if (!form.email?.includes("@") && !form.verificationAccount?.includes("@")) {
        setError("大型企业请填写公司邮箱");
        return;
      }
    } else if (proofImages.length < 3 || !proofImages[0]?.url) {
      setError("中小企业请上传执照/工牌及至少 2 张前台/门头照片");
      return;
    }
    setSaving(true);
    setError("");
    let asyncReportStarted = false;
    try {
      const res = await authFetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          galleryImages,
          proofImages,
          videos: videos.map((v) => ({
            platform: v.platform,
            url: v.url,
            title: v.title,
            coverUrl: v.cover_url,
            embedUrl: v.embed_url,
            canEmbed: v.can_embed,
          })),
        }),
      });
      const data = await parseJsonResponse<{ slug: string; error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "保存失败");

      if (generateBrandReport) {
        setPendingReportCardSlug(data.slug);
        await startBrandReport(data.slug);
        asyncReportStarted = true;
        setSaving(false);
        return;
      }

      setGenerationResult({
        cardHref: `/u/${data.slug}`,
        meHref: `/me?${new URLSearchParams({ created: data.slug }).toString()}`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
      setReportJob(null);
    } finally {
      if (!asyncReportStarted) {
        setSaving(false);
        setReportGenerating(false);
        setReportStatus("");
      }
    }
  }

  return (
    <div className="space-y-8">
      {/* Step 1: Raw text */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">1. 粘贴个人资料</h2>
        <p className="mt-1 text-sm text-slate-500">
          可以粘贴杂乱文字，AI 自动整理并扩写为 1000-2000 字的个人品牌主页内容
        </p>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            aria-pressed={!enrichFromWeb}
            onClick={() => setEnrichFromWeb(false)}
            className={`rounded-xl border-2 p-3 text-left transition ${
              !enrichFromWeb
                ? "border-slate-800 bg-slate-50 ring-2 ring-slate-200"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <FileText className="h-4 w-4" />
              粘贴资料生成
            </span>
            <span className="mt-1 block text-xs text-slate-500">
              粘贴个人介绍/简历，至少 10 个字
            </span>
          </button>
          <button
            type="button"
            aria-pressed={enrichFromWeb}
            onClick={() => setEnrichFromWeb(true)}
            className={`rounded-xl border-2 p-3 text-left transition ${
              enrichFromWeb
                ? "border-orange-500 bg-orange-50 ring-2 ring-orange-200"
                : "border-orange-100 bg-orange-50/40 hover:border-orange-300"
            }`}
          >
            <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-orange-800">
              <Globe className="h-4 w-4" />
              结合网上信息生成
              {enrichFromWeb && (
                <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                  已开启
                </span>
              )}
            </span>
            <span className="mt-1 block text-xs text-slate-600">
              名人/公众人物：百科确认身份后生成详细介绍，输入姓名即可（≥2 字）
            </span>
          </button>
        </div>
        <textarea
          rows={6}
          className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm leading-relaxed focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
          placeholder={
            enrichFromWeb
              ? "输入公众人物姓名即可，如：马斯克、马云、雷军…"
              : "粘贴您的个人介绍、简历、业务描述..."
          }
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
        />
        <p
          className={`mt-2 text-xs ${enrichFromWeb ? "font-medium text-orange-700" : "text-slate-500"}`}
        >
          {enrichFromWeb
            ? `已开启联网：当前 ${rawText.trim().length} 字，至少 2 字即可生成；重名时会要求确认身份`
            : "未开启联网：请至少粘贴 10 个字的个人资料（或点击上方开启联网，仅输入姓名即可）"}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setRawText(SAMPLE_TEXT)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
          >
            填入示例（陈行甲）
          </button>
          {enrichFromWeb && (
            <button
              type="button"
              onClick={() => setRawText("马斯克")}
              className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs text-orange-700 hover:bg-orange-100"
            >
              示例：马斯克（联网）
            </button>
          )}
          <button
            type="button"
            onClick={() => handleParse()}
            disabled={parsing || rawText.trim().length < minPasteLength}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-zinc-900 disabled:opacity-50"
          >
            {parsing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            AI 生成名片
          </button>
        </div>
        {parsing && enrichFromWeb && (
          <p className="mt-2 text-xs text-orange-600">正在检索百度百科、维基百科、新闻与网页…</p>
        )}
        {researchSteps.length > 0 && (
          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-600">已检索 {sourcesUsed} 条资料</p>
            <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-slate-600">
              {researchSteps
                .filter((s) => s.status === "done")
                .slice(-12)
                .map((step, i) => (
                  <li key={`${step.label}-${i}`}>
                    {step.label}
                    {step.detail ? ` Â· ${step.detail}` : ""}
                  </li>
                ))}
            </ul>
          </div>
        )}
      </section>

      {disambiguation && (
        <PersonDisambiguationPanel
          name={disambiguation.name}
          reason={disambiguation.reason}
          candidates={disambiguation.candidates}
          allowCompare={disambiguation.allowCompare}
          loading={parsing}
          onSelect={confirmCandidate}
          onCompare={handleCompare}
        />
      )}

      {comparison && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">{comparison.title}</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">{comparison.summary}</p>
          <div className="mt-4 space-y-4">
            {comparison.sections.map((section) => (
              <div key={section.title}>
                <h3 className="font-medium text-slate-900">{section.title}</h3>
                <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-600">
                  {section.content}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-slate-400">
            对比 {comparison.candidates.map((c) => c.label).join(" vs ")} · 主体约{" "}
            {comparison.long_content.length} 字
          </p>
        </section>
      )}

      {parsed && (
        <>
          {/* Step 2: Form */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">2. 确认信息</h2>
            {sourcesUsed > 0 && (
              <p className="mt-1 text-xs text-green-600">已整合 {sourcesUsed} 条网上公开资料</p>
            )}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {(
                [
                  ["name", "姓名", true],
                  ["title", "职位", false],
                  ["company", "公司", false],
                  ["brandSlogan", "品牌定位", false],
                  ["phone", "联系电话（可公开）", false],
                  ["email", "邮箱", false],
                  ["wechat", "微信", false],
                  ["address", "公司详细地址", false],
                ] as const
              ).map(([key, label, required]) => (
                <div key={key} className={key === "brandSlogan" ? "sm:col-span-2" : ""}>
                  <label className="text-sm font-medium text-slate-700">
                    {label}
                    {required && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-amber-400 focus:outline-none"
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                </div>
              ))}
              <div className="sm:col-span-2 rounded-xl border border-amber-100 bg-amber-50/60 p-4">
                <label className="flex items-start gap-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={form.exchangeEnabled}
                    onChange={(e) => setForm({ ...form, exchangeEnabled: e.target.checked })}
                  />
                  <span>
                    <span className="font-semibold text-slate-900">本人交换名片用，允许访客“收下名片 / 留资咨询”</span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                      名片电话、Logo、地址由本人或创建者自行提交并负责真实性；平台展示认证材料状态，不直接替本人背书。
                    </span>
                  </span>
                </label>
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-slate-700">个人简介（概述）</label>
                <textarea
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-amber-400 focus:outline-none"
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-slate-700">详细介绍（1000-2000 字主体内容）</label>
                <textarea
                  rows={10}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm leading-relaxed focus:border-amber-400 focus:outline-none"
                  value={form.longBio}
                  onChange={(e) => setForm({ ...form, longBio: e.target.value })}
                />
                <p className="mt-1 text-xs text-slate-400">当前约 {form.longBio.length} 字</p>
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-slate-700">模板主题</label>
                <select
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                  value={form.theme}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      theme: e.target.value as typeof form.theme,
                    })
                  }
                >
                  {Object.values(THEMES).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Step 3: Images */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">3. 图片与认证材料</h2>
            <p className="mt-1 text-sm text-slate-500">
              Logo、头像、电话和地址可由本人上传/填写；为降低冒名顶替风险，建议补充 2 张公司前台/门头背景照片，或填写一个已认证账号。
            </p>
            <div className="mt-4 grid gap-6 sm:grid-cols-3">
              <ImageUploader
                label="头像"
                value={form.avatarUrl}
                onChange={(url) => setForm({ ...form, avatarUrl: url })}
                aspect="square"
              />
              <ImageUploader
                label="封面背景图"
                value={form.coverUrl}
                onChange={(url) => setForm({ ...form, coverUrl: url })}
                aspect="cover"
                hint="建议横版图片"
              />
              <ImageUploader
                label="LOGO"
                value={form.logoUrl}
                onChange={(url) => setForm({ ...form, logoUrl: url })}
                aspect="square"
                hint="本人或公司 Logo"
              />
            </div>
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <h3 className="font-semibold text-slate-900">身份与公司认证材料</h3>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">{CARD_FIRST_PUBLISH_HINT}</p>
              <div className="mt-4 flex gap-2">
                {(
                  [
                    { value: "small", label: "中小企业" },
                    { value: "large", label: "大型企业" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        companySize: opt.value,
                        verificationMethod: opt.value === "large" ? "company_email" : "frontdesk_photos",
                      })
                    }
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                      form.companySize === opt.value
                        ? "border-orange-300 bg-orange-50 text-orange-800"
                        : "border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                {form.companySize === "large" ? CLAIM_LARGE_COMPANY_HINT : CLAIM_SMALL_COMPANY_HINT}
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-700">认证方式</label>
                  <select
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                    value={form.verificationMethod}
                    onChange={(e) => setForm({ ...form, verificationMethod: e.target.value })}
                    disabled={form.companySize === "large"}
                  >
                    <option value="license_or_badge">执照或工牌</option>
                    <option value="frontdesk_photos">公司前台/门头背景照片 2 张</option>
                    <option value="company_email">公司邮箱认证（回复即可）</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">公司邮箱 / 说明</label>
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                    placeholder={form.companySize === "large" ? "大公司填公司邮箱，回复即可" : "可选"}
                    value={form.verificationAccount || form.email}
                    onChange={(e) => setForm({ ...form, verificationAccount: e.target.value })}
                  />
                </div>
              </div>
              {form.companySize === "small" && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <ImageUploader
                    label="执照或工牌"
                    value={proofImages[0]?.url}
                    uploadIndex={galleryImages.length}
                    onChange={(url) =>
                      setProofImages((prev) => {
                        const next = [...prev];
                        next[0] = { url, type: "gallery", title: "执照或工牌" };
                        return next.filter(Boolean);
                      })
                    }
                    aspect="wide"
                  />
                  {[0, 1].map((slot) => (
                    <ImageUploader
                      key={slot}
                      label={`公司前台/门头背景照片 ${slot + 1}`}
                      value={proofImages[slot + 1]?.url}
                      uploadIndex={galleryImages.length + slot + 1}
                      onChange={(url) =>
                        setProofImages((prev) => {
                          const next = [...prev];
                          next[slot + 1] = { url, type: "gallery", title: `认证材料 ${slot + 1}` };
                          return next.filter(Boolean);
                        })
                      }
                      aspect="wide"
                      hint="用于待核验提示，不公开等同官方认证"
                    />
                  ))}
                </div>
              )}
              <label className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-600">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={form.personalCommitment}
                  onChange={(e) => setForm({ ...form, personalCommitment: e.target.checked })}
                />
                <span>{CLAIM_PERSONAL_COMMITMENT_TEXT}</span>
              </label>
              <label className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-600">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={form.disclaimerAccepted}
                  onChange={(e) => setForm({ ...form, disclaimerAccepted: e.target.checked })}
                />
                <span>{CLAIM_WEBSITE_DISCLAIMER}</span>
              </label>
            </div>
            <div className="mt-6">
              <ImageSearchPanel
                defaultQuery={form.name || form.company}
                entityType="person"
                selectLabel="设为封面"
                onSelect={(url) => {
                  if (!form.coverUrl) {
                    setForm((prev) => ({ ...prev, coverUrl: url }));
                  } else {
                    setGalleryImages((prev) => [
                      ...prev,
                      { url, type: "gallery", title: "联网搜图" },
                    ]);
                  }
                }}
              />
            </div>
            <div className="mt-6">
              <ImageUploader
                label="业务海报 / 案例图片"
                uploadIndex={galleryImages.length}
                onChange={(url) =>
                  setGalleryImages((prev) => [
                    ...prev,
                    { url, type: "gallery" },
                  ])
                }
                aspect="wide"
              />
              {galleryImages.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {galleryImages.map((img, i) => (
                    <div key={img.url} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={resolveAssetUrl(img.url)}
                        alt=""
                        className="aspect-square rounded-lg object-cover"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setGalleryImages((prev) =>
                            prev.filter((_, idx) => idx !== i),
                          )
                        }
                        className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Step 4: Videos */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">4. 视频链接</h2>
            <div className="mt-4 flex gap-2">
              <input
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                placeholder="粘贴抖音、B站、YouTube 等视频链接"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
              />
              <button
                type="button"
                onClick={handleAddVideo}
                disabled={videoLoading}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm hover:bg-slate-50"
              >
                {videoLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                添加
              </button>
            </div>
            {videos.length > 0 && (
              <div className="mt-4 space-y-3">
                {videos.map((video) => (
                  <div key={video.id} className="relative">
                    <VideoPreviewCard
                      platform={video.platform}
                      url={video.url}
                      title={video.title}
                      coverUrl={video.cover_url}
                      embedUrl={video.embed_url}
                      canEmbed={video.can_embed}
                      compact
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setVideos((prev) => prev.filter((v) => v.id !== video.id))
                      }
                      className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Save */}
          <div className="flex flex-col items-center gap-3 pb-8">
            <label className="flex w-full max-w-md cursor-pointer items-start gap-3 rounded-xl border border-purple-100 bg-purple-50/50 p-4">
              <input
                type="checkbox"
                className="mt-1"
                checked={generateBrandReport}
                onChange={(e) => setGenerateBrandReport(e.target.checked)}
              />
              <span className="text-sm text-slate-700">
                <span className="font-medium text-purple-800">同步生成 18 步品牌报告</span>
                <span className="mt-0.5 block text-slate-500">
                  与胖东来同款五段流水线：联网检索 → 证据整理 → AI 撰写 → 配图 → 保存报告（需登录）
                </span>
              </span>
            </label>
            {reportJob && (
              <GenerationProgressPanel
                jobId={reportJob.jobId}
                itemId={reportJob.itemId}
                active={reportGenerating}
                onComplete={(result) => {
                  setReportGenerating(false);
                  setReportJob(null);
                  setGenerationResult({
                    cardHref: `/u/${reportJob.cardSlug}`,
                    entityHref: result.entityHref,
                    reportHref: result.reportHref,
                    meHref: `/me?${new URLSearchParams({
                      created: reportJob.cardSlug,
                      report: result.reportHref || "",
                    }).toString()}`,
                  });
                }}
                onDisambiguation={(payload) => {
                  setReportGenerating(false);
                  setReportJob(null);
                  setDisambiguation(payload);
                  setError("生成品牌报告需先确认百科身份，请选择对应人物");
                }}
                onError={(msg) => {
                  setReportGenerating(false);
                  setReportJob(null);
                  setError(msg);
                }}
                onIdle={() => setReportGenerating(false)}
              />
            )}
            {reportStatus && !reportJob && (
              <p className="flex items-center gap-2 text-sm text-orange-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                {reportStatus}
              </p>
            )}
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
            {generationResult && (
              <div className="w-full max-w-2xl rounded-2xl border border-green-200 bg-green-50 p-5 text-left">
                <h3 className="font-bold text-green-900">生成完成，当前页面已保留</h3>
                <p className="mt-1 text-sm leading-7 text-green-800">
                  个人名片会出现在「我的品牌页」；个人报告生成后会出现在对应人物报告页。管理员可进入「内容管理」将页面设为公开、官方推荐或隐藏。
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {[
                    ["打开个人名片", generationResult.cardHref],
                    generationResult.entityHref ? ["打开人物档案", generationResult.entityHref] : null,
                    generationResult.reportHref ? ["打开个人报告", generationResult.reportHref] : null,
                    ["我的品牌页", generationResult.meHref],
                    ["管理员内容管理", "/admin/content"],
                  ].filter(Boolean).map((item) => {
                    const [label, href] = item as string[];
                    return (
                      <a
                        key={label}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-green-900 shadow-sm"
                      >
                        {label}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || reportGenerating}
              className="w-full max-w-md rounded-2xl bg-zinc-900 py-4 text-base font-semibold text-white disabled:opacity-50 sm:w-auto sm:px-12"
            >
              {saving || reportGenerating ? "处理中..." : "保存并预览名片"}
            </button>
          </div>
        </>
      )}

      {!parsed && error && (
        <p className="text-center text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}

