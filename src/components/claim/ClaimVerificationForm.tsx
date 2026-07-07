"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { ImageUploader } from "@/components/ui/ImageUploader";
import {
  CLAIM_LARGE_COMPANY_HINT,
  CLAIM_PERSONAL_COMMITMENT_TEXT,
  CLAIM_SMALL_COMPANY_HINT,
  CLAIM_VERIFICATION_INTRO,
  CLAIM_WEBSITE_DISCLAIMER,
  type ProofFile,
  validateClaimVerification,
} from "@/lib/config/claim-verification";

export type ClaimFormValues = {
  companySize: "large" | "small";
  verificationMethod: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  proofText: string;
  proofFiles: ProofFile[];
  personalCommitment: boolean;
  disclaimerAccepted: boolean;
};

const DEFAULT_VALUES: ClaimFormValues = {
  companySize: "small",
  verificationMethod: "frontdesk_photos",
  contactName: "",
  contactPhone: "",
  contactEmail: "",
  proofText: "",
  proofFiles: [],
  personalCommitment: false,
  disclaimerAccepted: false,
};

export function ClaimVerificationForm({
  entityId,
  claimType,
  entitySlug,
  onSuccess,
  themeButtonClass = "bg-gradient-to-r from-fuchsia-600 to-orange-500 text-white",
}: {
  entityId: string;
  claimType: string;
  entitySlug?: string;
  onSuccess?: (message: string) => void;
  themeButtonClass?: string;
}) {
  const [form, setForm] = useState<ClaimFormValues>(DEFAULT_VALUES);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function setProofAt(index: number, url: string, type: ProofFile["type"], title: string) {
    setForm((prev) => {
      const next = [...prev.proofFiles];
      next[index] = { type, url, title };
      return { ...prev, proofFiles: next.filter(Boolean) };
    });
  }

  async function submit() {
    setError("");
    const method =
      form.companySize === "large" ? "company_email" : form.verificationMethod || "frontdesk_photos";
    const validationError = validateClaimVerification({
      companySize: form.companySize,
      verificationMethod: method,
      contactEmail: form.contactEmail,
      proofFiles: form.proofFiles,
      personalCommitment: form.personalCommitment,
      disclaimerAccepted: form.disclaimerAccepted,
    });
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!form.contactName.trim()) {
      setError("请填写联系人姓名");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId,
          claimType,
          companySize: form.companySize,
          verificationMethod: method,
          contactName: form.contactName,
          contactPhone: form.contactPhone,
          contactEmail: form.contactEmail,
          proofText: form.proofText,
          proofFiles: form.proofFiles,
          personalCommitment: form.personalCommitment,
          disclaimerAccepted: form.disclaimerAccepted,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "提交失败");
      onSuccess?.("认领申请已提交，管理员确认后您可随时修改档案。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-xs leading-5 text-slate-600">
        <p className="flex items-center gap-1.5 font-semibold text-emerald-800">
          <ShieldCheck className="h-4 w-4" />
          认领认证说明
        </p>
        <p className="mt-1">{CLAIM_VERIFICATION_INTRO}</p>
      </div>

      <div>
        <label className="text-xs font-medium text-slate-600">企业规模</label>
        <div className="mt-2 flex gap-2">
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
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          placeholder="联系人姓名 *"
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          value={form.contactName}
          onChange={(e) => setForm({ ...form, contactName: e.target.value })}
        />
        <input
          placeholder="联系电话"
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          value={form.contactPhone}
          onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
        />
      </div>

      {form.companySize === "large" ? (
        <input
          placeholder="公司邮箱 *（管理员发信确认，回复即可）"
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          value={form.contactEmail}
          onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
        />
      ) : (
        <div className="space-y-3">
          <ImageUploader
            label="执照或工牌 *"
            aspect="wide"
            entitySlug={entitySlug}
            value={form.proofFiles.find((p) => p.type === "license_or_badge" || p.type === "work_badge")?.url}
            onChange={(url) => setProofAt(0, url, "license_or_badge", "执照或工牌")}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {[0, 1].map((slot) => (
              <ImageUploader
                key={slot}
                label={`前台/门头照片 ${slot + 1} *`}
                aspect="wide"
                entitySlug={entitySlug}
                uploadIndex={slot + 1}
                value={form.proofFiles.filter((p) => p.type === "frontdesk")[slot]?.url}
                onChange={(url) => {
                  const frontdesk = form.proofFiles.filter((p) => p.type === "frontdesk");
                  frontdesk[slot] = { type: "frontdesk", url, title: `前台照片 ${slot + 1}` };
                  const other = form.proofFiles.filter((p) => p.type !== "frontdesk");
                  setForm({ ...form, proofFiles: [...other, ...frontdesk] });
                }}
              />
            ))}
          </div>
          <input
            placeholder="公司邮箱（选填）"
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            value={form.contactEmail}
            onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
          />
        </div>
      )}

      <textarea
        placeholder="补充说明（选填）"
        rows={3}
        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
        value={form.proofText}
        onChange={(e) => setForm({ ...form, proofText: e.target.value })}
      />

      <label className="flex items-start gap-2 text-xs leading-5 text-slate-600">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={form.personalCommitment}
          onChange={(e) => setForm({ ...form, personalCommitment: e.target.checked })}
        />
        <span>{CLAIM_PERSONAL_COMMITMENT_TEXT}</span>
      </label>

      <label className="flex items-start gap-2 text-xs leading-5 text-slate-600">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={form.disclaimerAccepted}
          onChange={(e) => setForm({ ...form, disclaimerAccepted: e.target.checked })}
        />
        <span>{CLAIM_WEBSITE_DISCLAIMER}</span>
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        disabled={busy}
        onClick={submit}
        className={`w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-60 ${themeButtonClass}`}
      >
        {busy ? "提交中…" : "提交认领申请"}
      </button>
    </div>
  );
}
