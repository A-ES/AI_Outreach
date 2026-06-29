"use client";

import { useEffect, useState } from "react";
import type { Application, ResumeMatchResult, Resume } from "@/lib/types";
import { ResumeMatchResultView } from "@/components/resume-match/ResumeMatchResultView";
import { MatchResultsHistory } from "@/components/resume-match/MatchResultsHistory";
import { SequentialLoading } from "@/components/ui/SequentialLoading";

interface ResumeMatchViewProps {
  initialApplicationId?: string | null;
}

export function ResumeMatchView({ initialApplicationId = null }: ResumeMatchViewProps) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [applicationId, setApplicationId] = useState(initialApplicationId ?? "");
  const [jobDescriptionText, setJobDescriptionText] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [resumeId, setResumeId] = useState("");
  const [storedResumes, setStoredResumes] = useState<Resume[]>([]);
  const [resumeSource, setResumeSource] = useState<"paste" | "stored">("paste");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latestResult, setLatestResult] = useState<ResumeMatchResult | null>(null);
  const [selectedHistoryResult, setSelectedHistoryResult] = useState<ResumeMatchResult | null>(null);
  const [needsReview, setNeedsReview] = useState<string[] | null>(null);
  const [historyRefresh, setHistoryRefresh] = useState(0);

  useEffect(() => {
    async function loadApps() {
      const [appsRes, resumesRes] = await Promise.all([
        fetch("/api/applications"),
        fetch("/api/resumes"),
      ]);
      const data = await appsRes.json();
      const resumesData = await resumesRes.json();
      if (appsRes.ok) setApplications(data.applications);
      if (resumesRes.ok) setStoredResumes(resumesData.resumes);
    }
    loadApps();
  }, []);

  useEffect(() => {
    if (initialApplicationId) {
      setApplicationId(initialApplicationId);
    }
  }, [initialApplicationId]);

  useEffect(() => {
    if (!applicationId) return;
    const app = applications.find((a) => a.id === applicationId);
    if (app?.job_description_text) {
      setJobDescriptionText(app.job_description_text);
    }
  }, [applicationId, applications]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setNeedsReview(null);
    setLatestResult(null);
    setSelectedHistoryResult(null);

    try {
      const res = await fetch("/api/resume-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescriptionText,
          resumeText: resumeSource === "paste" ? resumeText : undefined,
          applicationId: applicationId || null,
          resumeId: resumeSource === "stored" && resumeId ? resumeId : null,
        }),
      });
      const data = await res.json();

      if (res.status === 422 && data.status === "needs_review") {
        setNeedsReview(data.validationErrors ?? ["Validation failed"]);
        return;
      }

      if (!res.ok) throw new Error(data.error ?? "Analysis failed");

      setLatestResult(data.result);
      if (applicationId) setHistoryRefresh((k) => k + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setSubmitting(false);
    }
  }

  const displayedResult = selectedHistoryResult ?? latestResult;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">Resume Match</h1>
        <p className="caption mt-1">
          Compare a resume against a job description and get a scored match analysis
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="caption mb-1 block font-medium">
            Link to application (optional)
          </label>
          <select
            value={applicationId}
            onChange={(e) => setApplicationId(e.target.value)}
            className="input-field"
          >
            <option value="">None — standalone analysis</option>
            {applications.map((app) => (
              <option key={app.id} value={app.id}>
                {app.company_name} — {app.role_title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="caption mb-1 block font-medium">
            Job description *
          </label>
          <textarea
            required
            rows={8}
            value={jobDescriptionText}
            onChange={(e) => setJobDescriptionText(e.target.value)}
            className="input-field font-mono text-xs"
            placeholder="Paste the full job description…"
          />
        </div>

        <div>
          <label className="caption mb-1 block font-medium">Resume source</label>
          <div className="mb-2 flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={resumeSource === "paste"}
                onChange={() => setResumeSource("paste")}
              />
              Paste text
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={resumeSource === "stored"}
                onChange={() => setResumeSource("stored")}
              />
              Stored resume
            </label>
          </div>
          {resumeSource === "stored" ? (
            <select
              required
              value={resumeId}
              onChange={(e) => setResumeId(e.target.value)}
              className="input-field"
            >
              <option value="">Select a saved resume…</option>
              {storedResumes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.version_label}
                  {r.is_base_resume ? " (base)" : ""}
                </option>
              ))}
            </select>
          ) : (
            <textarea
              required
              rows={10}
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              className="input-field font-mono text-xs"
              placeholder="Paste resume content (plain text or JSON)…"
            />
          )}
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        {needsReview && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-medium">Needs manual review</p>
            <p className="caption mt-1">
              The model output could not be validated. Please retry or review manually.
            </p>
            <ul className="mt-2 list-inside list-disc">
              {needsReview.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "Analyzing…" : "Run match analysis"}
        </button>
        {submitting && (
          <SequentialLoading
            steps={[
              "Analyzing job requirements...",
              "Comparing against your resume...",
              "Scoring keyword coverage...",
              "Validating the structured result...",
            ]}
          />
        )}
      </form>

      {displayedResult && <ResumeMatchResultView result={displayedResult} />}

      {applicationId && (
        <section className="card">
          <h2 className="section-heading mb-4">Past results for this application</h2>
          <MatchResultsHistory
            applicationId={applicationId}
            refreshKey={historyRefresh}
            onSelectResult={(r) => {
              setSelectedHistoryResult(r);
              setLatestResult(null);
            }}
          />
        </section>
      )}
    </div>
  );
}
