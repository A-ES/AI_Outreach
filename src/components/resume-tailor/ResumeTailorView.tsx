"use client";

import { useEffect, useMemo, useState } from "react";
import type { Application, FlaggedClaim, Resume } from "@/lib/types";
import type { ResumeContent } from "@/lib/validation/resume";
import { diffResumeContent } from "@/lib/utils/resume-diff";
import { HallucinationWarnings } from "@/components/resume-tailor/HallucinationWarnings";
import { ResumeDiffView } from "@/components/resume-tailor/ResumeDiffView";

interface TailorDraft {
  baseResumeId: string;
  baseContent: ResumeContent;
  tailoredContent: ResumeContent;
  flaggedClaims: FlaggedClaim[];
  applicationId: string | null;
}

interface TailorMeta {
  tailorLogId: string;
  hallucinationLogId: string;
  modelUsed: string;
  thinkingMode: boolean;
  tailorLatencyMs: number;
  hallucinationLatencyMs: number;
}

interface ResumeTailorViewProps {
  initialApplicationId?: string | null;
}

export function ResumeTailorView({ initialApplicationId = null }: ResumeTailorViewProps) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [baseResumeId, setBaseResumeId] = useState<string>("");
  const [applicationId, setApplicationId] = useState(initialApplicationId ?? "");
  const [jobDescriptionText, setJobDescriptionText] = useState("");
  const [useFlashFallback, setUseFlashFallback] = useState(false);
  const [thinkingMode, setThinkingMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<TailorDraft | null>(null);
  const [meta, setMeta] = useState<TailorMeta | null>(null);
  const [versionLabel, setVersionLabel] = useState("");
  const [needsReview, setNeedsReview] = useState<string[] | null>(null);

  useEffect(() => {
    async function load() {
      const [appsRes, resumesRes] = await Promise.all([
        fetch("/api/applications"),
        fetch("/api/resumes"),
      ]);
      const appsData = await appsRes.json();
      const resumesData = await resumesRes.json();
      if (appsRes.ok) setApplications(appsData.applications);
      if (resumesRes.ok) {
        setResumes(resumesData.resumes);
        if (resumesData.baseResumeId) setBaseResumeId(resumesData.baseResumeId);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (initialApplicationId) setApplicationId(initialApplicationId);
  }, [initialApplicationId]);

  useEffect(() => {
    if (!applicationId) return;
    const app = applications.find((a) => a.id === applicationId);
    if (app?.job_description_text) {
      setJobDescriptionText(app.job_description_text);
      setVersionLabel(`${app.company_name} — ${app.role_title}`);
    }
  }, [applicationId, applications]);

  const diffLines = useMemo(() => {
    if (!draft) return [];
    return diffResumeContent(draft.baseContent, draft.tailoredContent);
  }, [draft]);

  async function handleTailor(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setNeedsReview(null);
    setDraft(null);
    setMeta(null);

    try {
      if (!baseResumeId) throw new Error("Select a base resume first");

      const res = await fetch("/api/resume-tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseResumeId,
          jobDescriptionText,
          applicationId: applicationId || null,
          useFlashFallback,
          thinkingMode,
        }),
      });
      const data = await res.json();

      if (res.status === 422 && data.status === "needs_review") {
        setNeedsReview(data.validationErrors ?? ["Validation failed"]);
        return;
      }

      if (!res.ok) throw new Error(data.error ?? "Tailoring failed");

      setDraft(data.draft);
      setMeta(data.meta);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tailoring failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove() {
    if (!draft) return;
    setApproving(true);
    setError(null);

    try {
      const res = await fetch("/api/resume-tailor/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version_label: versionLabel || "Tailored version",
          content_json: draft.tailoredContent,
          applicationId: draft.applicationId,
          baseResumeId: draft.baseResumeId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");

      setDraft(null);
      setMeta(null);
      setNeedsReview(null);
      alert("Tailored resume saved to version history.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to approve");
    } finally {
      setApproving(false);
    }
  }

  function handleDiscard() {
    setDraft(null);
    setMeta(null);
    setNeedsReview(null);
  }

  const baseResumes = resumes.filter((r) => r.is_base_resume);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">Resume Tailor</h1>
        <p className="caption mt-1">
          Generate a job-specific resume variant from your base resume — review before saving
        </p>
      </div>

      <form onSubmit={handleTailor} className="card space-y-4">
        <div>
          <label className="caption mb-1 block font-medium">Base resume *</label>
          {baseResumes.length === 0 ? (
            <p className="caption text-amber-700">
              No base resume found.{" "}
              <a href="/resumes" className="underline">
                Create one first
              </a>
              .
            </p>
          ) : (
            <select
              required
              value={baseResumeId}
              onChange={(e) => setBaseResumeId(e.target.value)}
              className="input-field"
            >
              <option value="">Select base resume…</option>
              {baseResumes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.version_label}
                </option>
              ))}
              {resumes
                .filter((r) => !r.is_base_resume)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.version_label} (not base)
                  </option>
                ))}
            </select>
          )}
        </div>

        <div>
          <label className="caption mb-1 block font-medium">
            Application (optional — pre-fills JD)
          </label>
          <select
            value={applicationId}
            onChange={(e) => setApplicationId(e.target.value)}
            className="input-field"
          >
            <option value="">None</option>
            {applications.map((app) => (
              <option key={app.id} value={app.id}>
                {app.company_name} — {app.role_title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="caption mb-1 block font-medium">Job description *</label>
          <textarea
            required
            rows={8}
            value={jobDescriptionText}
            onChange={(e) => setJobDescriptionText(e.target.value)}
            className="input-field font-mono text-xs"
          />
        </div>

        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={useFlashFallback}
              onChange={(e) => setUseFlashFallback(e.target.checked)}
            />
            Use flash fallback model
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={thinkingMode}
              onChange={(e) => setThinkingMode(e.target.checked)}
            />
            Enable thinking mode (pro model)
          </label>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        {needsReview && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
            <p className="font-medium">Needs manual review</p>
            <ul className="mt-2 list-inside list-disc">
              {needsReview.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        <button type="submit" disabled={submitting || !baseResumeId} className="btn-primary">
          {submitting ? "Tailoring…" : "Generate tailored draft"}
        </button>
      </form>

      {draft && (
        <div className="space-y-6">
          {meta && (
            <p className="caption">
              Model: {meta.modelUsed} · Thinking: {meta.thinkingMode ? "on" : "off"} ·
              Tailor: {meta.tailorLatencyMs}ms · Hallucination check:{" "}
              {meta.hallucinationLatencyMs}ms
            </p>
          )}

          <HallucinationWarnings claims={draft.flaggedClaims} />

          <section>
            <h2 className="section-heading mb-3">Base vs. tailored diff</h2>
            <ResumeDiffView lines={diffLines} />
          </section>

          <section className="card space-y-4">
            <h2 className="section-heading">Approve tailored version</h2>
            <p className="caption">
              Nothing is saved until you explicitly approve. Discarding removes this draft
              without adding to version history.
            </p>
            <div>
              <label className="caption mb-1 block font-medium">Version label</label>
              <input
                value={versionLabel}
                onChange={(e) => setVersionLabel(e.target.value)}
                className="input-field"
                placeholder="e.g. Acme Corp — Senior Engineer"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleApprove}
                disabled={approving || !versionLabel.trim()}
                className="btn-primary"
              >
                {approving ? "Saving…" : "Approve & save"}
              </button>
              <button type="button" onClick={handleDiscard} className="btn-secondary">
                Discard draft
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
