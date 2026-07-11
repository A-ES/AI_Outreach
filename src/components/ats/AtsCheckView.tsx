"use client";

import { useCallback, useEffect, useState } from "react";
import type { AtsCheckResultRecord, Resume } from "@/lib/types";
import type { AtsCheckItem, AtsCheckResult } from "@/lib/validation/ats";
import { EmptyState } from "@/components/ui/EmptyState";
import { SequentialLoading } from "@/components/ui/SequentialLoading";

function getScoreBand(score: number): { label: string; className: string } {
  if (score >= 90) return { label: "Excellent", className: "text-emerald-700 dark:text-emerald-300" };
  if (score >= 75) return { label: "Good", className: "text-blue-700 dark:text-blue-300" };
  if (score >= 60) return { label: "Needs Improvement", className: "text-amber-700 dark:text-amber-300" };
  return { label: "Poor", className: "text-red-700 dark:text-red-300" };
}

export function AtsCheckView() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [resumeId, setResumeId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<AtsCheckResult | null>(null);
  const [history, setHistory] = useState<AtsCheckResultRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [resumesRes, historyRes] = await Promise.all([
        fetch("/api/resumes"),
        fetch(`/api/ats-check${resumeId ? `?resumeId=${resumeId}` : ""}`),
      ]);
      const resumesData = await readJsonResponse(resumesRes, "/api/resumes");
      const historyData = await readJsonResponse(historyRes, "/api/ats-check");
      if (!resumesRes.ok) throw new Error(resumesData.error ?? "Failed to load resumes");
      if (!historyRes.ok) throw new Error(historyData.error ?? "Failed to load ATS history");
      setResumes(resumesData.resumes);
      setHistory(historyData.results);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load ATS check");
    } finally {
      setLoading(false);
    }
  }, [resumeId]);

  useEffect(() => {
    load();
  }, [load]);

  async function runCheck(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setChecking(true);
    setError(null);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (resumeId) formData.append("resumeId", resumeId);
      const res = await fetch("/api/ats-check", { method: "POST", body: formData });
      const data = await readJsonResponse(res, "/api/ats-check");
      if (!res.ok) throw new Error(data.error ?? "Failed to run ATS check");
      setResult(data.result);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to run ATS check");
    } finally {
      setChecking(false);
    }
  }

  async function handleDeleteHistory(id: string) {
    if (!confirm("Delete this ATS check result?")) return;
    try {
      const res = await fetch(`/api/ats-check/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to delete");
      }
      setHistory((prev) => prev.filter((item) => item.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">ATS Check</h1>
        <p className="caption mt-1">
          Check whether a resume PDF is structurally easy for applicant tracking systems to parse
        </p>
      </div>

      {error && (
        <p className="rounded-card bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </p>
      )}

      <form onSubmit={runCheck} className="card space-y-4">
        <div>
          <label className="caption mb-1 block font-medium">
            Associate with resume version
          </label>
          <select
            value={resumeId}
            onChange={(e) => setResumeId(e.target.value)}
            className="input-field"
          >
            <option value="">No associated version</option>
            {resumes.map((resume) => (
              <option key={resume.id} value={resume.id}>
                {resume.version_label}
                {resume.is_base_resume ? " (base)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="caption mb-1 block font-medium">Resume PDF *</label>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="input-field"
            required
          />
        </div>
        <button type="submit" disabled={checking || !file} className="btn-primary">
          {checking ? "Checking..." : "Run ATS check"}
        </button>
        {checking && (
          <SequentialLoading
            steps={[
              "Extracting PDF text layer...",
              "Inspecting layout and tables...",
              "Checking section headers...",
              "Computing score...",
            ]}
          />
        )}
      </form>

      {result && <AtsResultCard result={result} />}

      <section className="card">
        <h2 className="section-heading mb-4">Check history</h2>
        {loading ? (
          <p className="caption">Loading history...</p>
        ) : history.length === 0 ? (
          <EmptyState
            title="No ATS checks yet"
            description="Upload a resume PDF to create a structural parseability report."
          />
        ) : (
          <div className="space-y-3">
            {history.map((item) => (
              <div key={item.id} className="rounded-card border border-border bg-surface p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <HistoryScore checks={item.checks} />
                    <p className="text-sm font-medium text-foreground">
                      {item.overall_pass ? "Passed" : "Needs fixes"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="caption">{new Date(item.created_at).toLocaleString()}</p>
                    <button
                      type="button"
                      onClick={() => handleDeleteHistory(item.id)}
                      className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      title="Delete this check"
                      aria-label="Delete this check"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
                <AtsCheckList checks={item.checks} compact />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

function computeScoreFromChecks(checks: AtsCheckItem[]): number {
  const weights: Record<string, number> = {
    text_extractability: 30,
    multi_column_layout: 20,
    section_headers_recognizable: 20,
    contact_info_location: 10,
    tables_or_textboxes: 10,
    special_characters: 10,
  };
  let total = 0;
  for (const check of checks) {
    const weight = weights[check.check_name] ?? 10;
    if (check.passed) total += weight;
  }
  return Math.min(100, Math.max(0, total));
}

function HistoryScore({ checks }: { checks: AtsCheckItem[] }) {
  const score = computeScoreFromChecks(checks);
  const band = getScoreBand(score);
  return (
    <span className={`text-sm font-semibold ${band.className}`}>
      {score}/100
    </span>
  );
}

async function readJsonResponse(res: Response, label: string) {
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return res.json();
  }

  const text = await res.text();
  const pageTitle = text.match(/<title>(.*?)<\/title>/i)?.[1];
  const hint = pageTitle ? ` (${pageTitle})` : "";
  return {
    error: `${label} returned ${res.status} ${res.statusText || ""} as HTML${hint}. Restart the dev server.`,
  };
}

function AtsResultCard({ result }: { result: AtsCheckResult }) {
  const score = result.score ?? computeScoreFromChecks(result.checks);
  const band = getScoreBand(score);
  const failingChecks = result.checks.filter((c) => !c.passed);

  return (
    <section className="card space-y-6">
      {/* Score display */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <span className={`text-5xl font-bold ${band.className}`}>{score}</span>
          <span className="text-lg text-muted">/100</span>
          <span className={`ml-2 text-lg font-medium ${band.className}`}>{band.label}</span>
        </div>
        <span
          className={`status-pill ${
            result.overall_pass
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
              : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-100"
          }`}
        >
          {result.overall_pass ? "All checks pass" : `${failingChecks.length} issue${failingChecks.length > 1 ? "s" : ""} found`}
        </span>
      </div>

      {/* Recommended changes for failing checks */}
      {failingChecks.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Recommended changes</h3>
          <ol className="space-y-2 list-decimal pl-5">
            {failingChecks.map((check) => (
              <li key={check.check_name} className="text-sm text-foreground">
                <span className="font-medium">
                  {check.check_name.replaceAll("_", " ")}:
                </span>{" "}
                {check.recommendation || check.suggested_fix || check.detail}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Individual check results */}
      <div>
        <h3 className="section-heading mb-3">Check details</h3>
        <AtsCheckList checks={result.checks} />
      </div>
    </section>
  );
}

function AtsCheckList({
  checks,
  compact,
}: {
  checks: AtsCheckItem[];
  compact?: boolean;
}) {
  return (
    <div className={`mt-2 grid gap-3 ${compact ? "" : "md:grid-cols-2"}`}>
      {checks.map((check) => (
        <div key={check.check_name} className="rounded-card border border-border bg-panel-subtle p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-foreground">
              {check.check_name.replaceAll("_", " ")}
            </p>
            <span
              className={`status-pill ${
                check.passed
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                  : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200"
              }`}
            >
              {check.passed ? "Pass" : "Fail"}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted">{check.detail}</p>
        </div>
      ))}
    </div>
  );
}
