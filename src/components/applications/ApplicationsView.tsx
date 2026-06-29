"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Application, ApplicationStatus } from "@/lib/types";
import { APPLICATION_STATUSES, STATUS_LABELS } from "@/lib/types";
import { formatDate } from "@/lib/utils/dates";
import { KanbanBoard } from "@/components/applications/KanbanBoard";

type ViewMode = "list" | "board";

const emptyForm = {
  company_name: "",
  role_title: "",
  job_description_text: "",
  status: "saved" as ApplicationStatus,
  date_applied: "",
  notes: "",
};

export function ApplicationsView() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("board");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  async function loadApplications() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/applications");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load applications");
      setApplications(data.applications);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load applications");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadApplications();
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(app: Application) {
    setEditingId(app.id);
    setForm({
      company_name: app.company_name,
      role_title: app.role_title,
      job_description_text: app.job_description_text ?? "",
      status: app.status,
      date_applied: app.date_applied ?? "",
      notes: app.notes ?? "",
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      company_name: form.company_name,
      role_title: form.role_title,
      job_description_text: form.job_description_text || null,
      status: form.status,
      date_applied: form.date_applied || null,
      notes: form.notes || null,
    };

    try {
      const res = await fetch(
        editingId ? `/api/applications/${editingId}` : "/api/applications",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save application");

      setShowForm(false);
      await loadApplications();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save application");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this application?")) return;
    try {
      const res = await fetch(`/api/applications/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to delete");
      }
      await loadApplications();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete application");
    }
  }

  async function handleStatusChange(id: string, status: ApplicationStatus) {
    const res = await fetch(`/api/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Failed to update status");

    setApplications((prev) =>
      prev.map((a) => (a.id === id ? data.application : a))
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Applications</h1>
          <p className="caption mt-1">Track roles and pipeline stages</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
            <ViewToggle active={view === "board"} onClick={() => setView("board")}>
              Board
            </ViewToggle>
            <ViewToggle active={view === "list"} onClick={() => setView("list")}>
              List
            </ViewToggle>
          </div>
          <button type="button" onClick={openCreate} className="btn-primary">
            Add application
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {showForm && (
        <section className="card">
          <h2 className="section-heading mb-4">
            {editingId ? "Edit application" : "New application"}
          </h2>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <Field label="Company" required>
              <input
                required
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                className="input-field"
              />
            </Field>
            <Field label="Role" required>
              <input
                required
                value={form.role_title}
                onChange={(e) => setForm({ ...form, role_title: e.target.value })}
                className="input-field"
              />
            </Field>
            <Field label="Status">
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as ApplicationStatus })
                }
                className="input-field"
              >
                {APPLICATION_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date applied">
              <input
                type="date"
                value={form.date_applied}
                onChange={(e) => setForm({ ...form, date_applied: e.target.value })}
                className="input-field"
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Job description">
                <textarea
                  rows={4}
                  value={form.job_description_text}
                  onChange={(e) =>
                    setForm({ ...form, job_description_text: e.target.value })
                  }
                  className="input-field"
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Notes">
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="input-field"
                />
              </Field>
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      {loading ? (
        <p className="body-text">Loading applications…</p>
      ) : view === "board" ? (
        <KanbanBoard
          applications={applications}
          onStatusChange={handleStatusChange}
          onEdit={openEdit}
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="pb-3 pr-4 font-medium">Company</th>
                <th className="pb-3 pr-4 font-medium">Role</th>
                <th className="pb-3 pr-4 font-medium">Status</th>
                <th className="pb-3 pr-4 font-medium">Applied</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app.id} className="border-b border-slate-100">
                  <td className="py-3 pr-4 font-medium">{app.company_name}</td>
                  <td className="py-3 pr-4">{app.role_title}</td>
                  <td className="py-3 pr-4">{STATUS_LABELS[app.status]}</td>
                  <td className="py-3 pr-4">{formatDate(app.date_applied)}</td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      <Link
                        href={`/applications/${app.id}`}
                        className="text-indigo-700 hover:underline"
                      >
                        View
                      </Link>
                      <button
                        type="button"
                        onClick={() => openEdit(app)}
                        className="text-indigo-700 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(app.id)}
                        className="text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {applications.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No applications yet. Add your first one above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ViewToggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
        active ? "bg-indigo-700 text-white" : "text-slate-600 hover:text-slate-900"
      }`}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="caption mb-1 block font-medium">
        {label}
        {required && " *"}
      </span>
      {children}
    </label>
  );
}
