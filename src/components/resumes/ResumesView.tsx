"use client";

import { useEffect, useState } from "react";
import type { Resume } from "@/lib/types";
import type { ResumeContent } from "@/lib/validation/resume";
import { emptyResumeContent } from "@/lib/validation/resume";
import { formatDate } from "@/lib/utils/dates";
import { ResumeStructuredEditor } from "@/components/resumes/ResumeStructuredEditor";
import { EmptyState } from "@/components/ui/EmptyState";

export function ResumesView() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [baseResumeId, setBaseResumeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [versionLabel, setVersionLabel] = useState("Base resume");
  const [content, setContent] = useState<ResumeContent>(emptyResumeContent());
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/resumes");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load resumes");
      setResumes(data.resumes);
      setBaseResumeId(data.baseResumeId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load resumes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function startNewBase() {
    setEditingId(null);
    setVersionLabel("Base resume");
    setContent(emptyResumeContent());
  }

  function startEdit(resume: Resume) {
    setEditingId(resume.id);
    setVersionLabel(resume.version_label);
    setContent(resume.content_json);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const isNewBase = !editingId;
      const res = await fetch(editingId ? `/api/resumes/${editingId}` : "/api/resumes", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version_label: versionLabel,
          content_json: content,
          ...(isNewBase && !editingId ? { is_base_resume: true } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save resume");

      if (isNewBase && data.resume?.id) {
        await fetch(`/api/resumes/${data.resume.id}/set-base`, { method: "POST" });
      }

      await load();
      setEditingId(data.resume?.id ?? editingId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save resume");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSetBase(id: string) {
    try {
      const res = await fetch(`/api/resumes/${id}/set-base`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to set base");
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to set base resume");
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Resumes</h1>
          <p className="caption mt-1">
            Manage your structured base resume and approved tailored versions
          </p>
        </div>
        <button type="button" onClick={startNewBase} className="btn-secondary">
          New base resume
        </button>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <form onSubmit={handleSave} className="card space-y-4">
        <h2 className="section-heading">
          {editingId ? "Edit resume" : "Create base resume"}
        </h2>
        <div>
          <label className="caption mb-1 block font-medium">Version label</label>
          <input
            required
            value={versionLabel}
            onChange={(e) => setVersionLabel(e.target.value)}
            className="input-field"
          />
        </div>
        <ResumeStructuredEditor content={content} onChange={setContent} />
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "Saving…" : editingId ? "Save changes" : "Save as base resume"}
        </button>
      </form>

      <section className="card">
        <h2 className="section-heading mb-4">Version history</h2>
        {loading ? (
          <p className="caption">Loading…</p>
        ) : resumes.length === 0 ? (
          <EmptyState
            title="No saved resume versions"
            description="Save a structured base resume first. Tailored versions will appear here after you approve them."
          />
        ) : (
          <div className="space-y-2">
            {resumes.map((resume) => (
              <div
                key={resume.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-border bg-surface px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {resume.version_label}
                    {resume.is_base_resume && (
                      <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent">
                        Base
                      </span>
                    )}
                    {resume.tailored_for_application_id && (
                      <span className="caption ml-2">Tailored version</span>
                    )}
                  </p>
                  <p className="caption">{formatDate(resume.created_at.slice(0, 10))}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(resume)}
                    className="text-sm text-accent hover:underline"
                  >
                    Edit
                  </button>
                  {!resume.is_base_resume && (
                    <button
                      type="button"
                      onClick={() => handleSetBase(resume.id)}
                      className="text-sm text-accent hover:underline"
                    >
                      Set as base
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {baseResumeId && (
          <p className="caption mt-4">
            Current base resume ID: <code className="text-xs">{baseResumeId}</code>
          </p>
        )}
      </section>
    </div>
  );
}
