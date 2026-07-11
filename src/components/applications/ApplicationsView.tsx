"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Application, ApplicationStatus, Contact, FollowupStatus } from "@/lib/types";
import {
  APPLICATION_STATUSES,
  APPLICATION_PLATFORMS,
  FOLLOWUP_STATUSES,
  FOLLOWUP_STATUS_LABELS,
  STATUS_LABELS,
} from "@/lib/types";
import { formatDate } from "@/lib/utils/dates";
import { KanbanBoard } from "@/components/applications/KanbanBoard";
import { EmptyState } from "@/components/ui/EmptyState";

type ViewMode = "list" | "board";
type SortKey = "company_name" | "role_title" | "platform" | "date_applied" | "days_since" | "followup_status" | "status";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 30;

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function daysSince(dateStr: string | null): number {
  if (!dateStr) return 0;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.max(0, Math.floor(diff / 86400000));
}

const emptyForm = {
  company_name: "",
  role_title: "",
  platform: "" as string,
  application_url: "",
  contact_id: "",
  job_description_text: "",
  status: "applied" as ApplicationStatus,
  date_applied: todayDate(),
  notes: "",
};

export function ApplicationsView() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("list");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [showJobDesc, setShowJobDesc] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [filterPlatform, setFilterPlatform] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>("date_applied");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Pagination
  const [page, setPage] = useState(0);

  // Bulk selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  async function loadApplications() {
    setLoading(true);
    setError(null);
    try {
      const [appRes, contactRes] = await Promise.all([
        fetch("/api/applications"),
        fetch("/api/contacts"),
      ]);
      const appData = await appRes.json();
      const contactData = await contactRes.json();
      if (!appRes.ok) throw new Error(appData.error ?? "Failed to load applications");
      setApplications(appData.applications);
      if (contactRes.ok) setContacts(contactData.contacts ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load applications");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadApplications(); }, []);

  // Filtered + sorted list
  const filtered = useMemo(() => {
    let list = applications;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) => a.company_name.toLowerCase().includes(q) || a.role_title.toLowerCase().includes(q)
      );
    }
    if (filterPlatform) list = list.filter((a) => a.platform === filterPlatform);
    if (filterStatus) list = list.filter((a) => a.status === filterStatus);
    if (filterDateFrom) list = list.filter((a) => (a.date_applied ?? "") >= filterDateFrom);
    if (filterDateTo) list = list.filter((a) => (a.date_applied ?? "") <= filterDateTo);

    list = [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "company_name": cmp = a.company_name.localeCompare(b.company_name); break;
        case "role_title": cmp = a.role_title.localeCompare(b.role_title); break;
        case "platform": cmp = (a.platform ?? "").localeCompare(b.platform ?? ""); break;
        case "date_applied": cmp = (a.date_applied ?? "").localeCompare(b.date_applied ?? ""); break;
        case "days_since": cmp = daysSince(a.date_applied) - daysSince(b.date_applied); break;
        case "followup_status": cmp = (a.followup_status ?? "").localeCompare(b.followup_status ?? ""); break;
        case "status": cmp = APPLICATION_STATUSES.indexOf(a.status) - APPLICATION_STATUSES.indexOf(b.status); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [applications, search, filterPlatform, filterStatus, filterDateFrom, filterDateTo, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
    setPage(0);
  }

  // Selection helpers
  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function toggleSelectAll() {
    if (selected.size === paged.length) setSelected(new Set());
    else setSelected(new Set(paged.map((a) => a.id)));
  }

  // Bulk actions
  async function bulkStatusChange(status: ApplicationStatus) {
    for (const id of Array.from(selected)) {
      await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    }
    setSelected(new Set());
    await loadApplications();
  }
  async function bulkDelete() {
    if (!confirm(`Delete ${selected.size} application(s)?`)) return;
    for (const id of Array.from(selected)) {
      await fetch(`/api/applications/${id}`, { method: "DELETE" });
    }
    setSelected(new Set());
    await loadApplications();
  }

  // Inline follow-up change
  async function handleFollowupChange(id: string, followup_status: FollowupStatus | "") {
    await fetch(`/api/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ followup_status: followup_status || null }),
    });
    setApplications((prev) =>
      prev.map((a) => (a.id === id ? { ...a, followup_status: (followup_status || null) as FollowupStatus | null } : a))
    );
  }

  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyForm, date_applied: todayDate() });
    setShowJobDesc(false);
    setShowForm(true);
  }

  function openEdit(app: Application) {
    setEditingId(app.id);
    setForm({
      company_name: app.company_name,
      role_title: app.role_title,
      platform: app.platform ?? "",
      application_url: app.application_url ?? "",
      contact_id: app.contact_id ?? "",
      job_description_text: app.job_description_text ?? "",
      status: app.status,
      date_applied: app.date_applied ?? "",
      notes: app.notes ?? "",
    });
    setShowJobDesc(Boolean(app.job_description_text));
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const payload = {
      company_name: form.company_name,
      role_title: form.role_title,
      platform: form.platform || null,
      application_url: form.application_url || null,
      contact_id: form.contact_id || null,
      job_description_text: form.job_description_text || null,
      status: form.status,
      date_applied: form.date_applied || null,
      notes: form.notes || null,
    };
    try {
      const res = await fetch(
        editingId ? `/api/applications/${editingId}` : "/api/applications",
        { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save application");
      setShowForm(false);
      await loadApplications();
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to save"); }
    finally { setSubmitting(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this application?")) return;
    try {
      const res = await fetch(`/api/applications/${id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed"); }
      await loadApplications();
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to delete"); }
  }

  async function handleStatusChange(id: string, status: ApplicationStatus) {
    const res = await fetch(`/api/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Failed to update status");
    setApplications((prev) => prev.map((a) => (a.id === id ? data.application : a)));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Applications</h1>
          <p className="caption mt-1">{applications.length} total · {filtered.length} shown</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-control border border-border bg-surface p-1">
            <ViewToggle active={view === "list"} onClick={() => setView("list")}>List</ViewToggle>
            <ViewToggle active={view === "board"} onClick={() => setView("board")}>Board</ViewToggle>
          </div>
          <button type="button" onClick={openCreate} className="btn-primary">Add application</button>
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {/* Form */}
      {showForm && (
        <section className="card">
          <h2 className="section-heading mb-4">{editingId ? "Edit application" : "New application"}</h2>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <Field label="Company" required><input required value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className="input-field" /></Field>
            <Field label="Role" required><input required value={form.role_title} onChange={(e) => setForm({ ...form, role_title: e.target.value })} className="input-field" /></Field>
            <Field label="Platform"><select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} className="input-field"><option value="">Select…</option>{APPLICATION_PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}</select></Field>
            <Field label="Application URL"><input type="url" placeholder="https://..." value={form.application_url} onChange={(e) => setForm({ ...form, application_url: e.target.value })} className="input-field" /></Field>
            <Field label="Linked Contact"><select value={form.contact_id} onChange={(e) => setForm({ ...form, contact_id: e.target.value })} className="input-field"><option value="">None</option>{contacts.map((c) => <option key={c.id} value={c.id}>{c.name}{c.company_name ? ` (${c.company_name})` : ""}</option>)}</select></Field>
            <Field label="Status"><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ApplicationStatus })} className="input-field">{APPLICATION_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}</select></Field>
            <Field label="Date applied"><input type="date" value={form.date_applied} onChange={(e) => setForm({ ...form, date_applied: e.target.value })} className="input-field" /></Field>
            <div className="sm:col-span-2"><Field label="Notes"><textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input-field" /></Field></div>
            <div className="sm:col-span-2">
              {!showJobDesc ? <button type="button" onClick={() => setShowJobDesc(true)} className="text-sm text-accent hover:underline">+ Add job description</button>
              : <Field label="Job description"><textarea rows={4} value={form.job_description_text} onChange={(e) => setForm({ ...form, job_description_text: e.target.value })} className="input-field" /></Field>}
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <button type="submit" disabled={submitting} className="btn-primary">{submitting ? "Saving…" : "Save"}</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </section>
      )}

      {/* Content */}
      {loading ? <p className="body-text">Loading…</p> : applications.length === 0 ? (
        <EmptyState title="No applications tracked yet" description="Create your first role to get started." action={<button type="button" onClick={openCreate} className="btn-primary">Add application</button>} />
      ) : view === "board" ? (
        <KanbanBoard applications={applications} onStatusChange={handleStatusChange} onEdit={openEdit} maxPerColumn={10} />
      ) : (
        <>
          {/* Search + Filters */}
          <div className="card space-y-3">
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder="Search company or role…" className="input-field" />
            <div className="flex flex-wrap gap-3">
              <select value={filterPlatform} onChange={(e) => { setFilterPlatform(e.target.value); setPage(0); }} className="input-field w-auto">
                <option value="">All platforms</option>
                {APPLICATION_PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(0); }} className="input-field w-auto">
                <option value="">All statuses</option>
                {APPLICATION_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
              <input type="date" value={filterDateFrom} onChange={(e) => { setFilterDateFrom(e.target.value); setPage(0); }} className="input-field w-auto" title="From date" />
              <input type="date" value={filterDateTo} onChange={(e) => { setFilterDateTo(e.target.value); setPage(0); }} className="input-field w-auto" title="To date" />
            </div>
          </div>

          {/* Bulk actions */}
          {selected.size > 0 && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg bg-accent-soft px-4 py-2">
              <span className="text-sm font-medium">{selected.size} selected</span>
              <select onChange={(e) => { if (e.target.value) bulkStatusChange(e.target.value as ApplicationStatus); e.target.value = ""; }} className="input-field w-auto text-sm" defaultValue="">
                <option value="" disabled>Change status…</option>
                {APPLICATION_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
              <button type="button" onClick={bulkDelete} className="text-sm text-red-600 hover:underline">Delete selected</button>
              <button type="button" onClick={() => setSelected(new Set())} className="text-sm text-muted hover:underline">Clear</button>
            </div>
          )}

          {/* Table */}
          <div className="card overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted">
                  <th className="pb-3 pr-2"><input type="checkbox" checked={selected.size === paged.length && paged.length > 0} onChange={toggleSelectAll} /></th>
                  <SortHeader label="Company" sortKey="company_name" current={sortKey} dir={sortDir} onClick={toggleSort} />
                  <SortHeader label="Role" sortKey="role_title" current={sortKey} dir={sortDir} onClick={toggleSort} />
                  <SortHeader label="Platform" sortKey="platform" current={sortKey} dir={sortDir} onClick={toggleSort} />
                  <SortHeader label="Applied" sortKey="date_applied" current={sortKey} dir={sortDir} onClick={toggleSort} />
                  <SortHeader label="Days" sortKey="days_since" current={sortKey} dir={sortDir} onClick={toggleSort} />
                  <SortHeader label="Follow-up" sortKey="followup_status" current={sortKey} dir={sortDir} onClick={toggleSort} />
                  <SortHeader label="Status" sortKey="status" current={sortKey} dir={sortDir} onClick={toggleSort} />
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((app) => (
                  <tr key={app.id} className="border-b border-border/70 hover:bg-panel-subtle/50">
                    <td className="py-2 pr-2"><input type="checkbox" checked={selected.has(app.id)} onChange={() => toggleSelect(app.id)} /></td>
                    <td className="py-2 pr-3 font-medium">{app.company_name}</td>
                    <td className="py-2 pr-3">{app.role_title}</td>
                    <td className="py-2 pr-3 text-muted">{app.platform ?? "—"}</td>
                    <td className="py-2 pr-3">{formatDate(app.date_applied)}</td>
                    <td className="py-2 pr-3 text-muted">{app.date_applied ? daysSince(app.date_applied) : "—"}</td>
                    <td className="py-2 pr-3">
                      {app.status === "applied" ? (
                        <select
                          value={app.followup_status ?? ""}
                          onChange={(e) => handleFollowupChange(app.id, e.target.value as FollowupStatus | "")}
                          className="input-field w-auto py-1 text-xs"
                        >
                          <option value="">—</option>
                          {FOLLOWUP_STATUSES.map((fs) => <option key={fs} value={fs}>{FOLLOWUP_STATUS_LABELS[fs]}</option>)}
                        </select>
                      ) : <span className="text-muted">—</span>}
                    </td>
                    <td className="py-2 pr-3">{STATUS_LABELS[app.status]}</td>
                    <td className="py-2">
                      <div className="flex gap-2">
                        <Link href={`/applications/${app.id}`} className="text-accent hover:underline text-xs">View</Link>
                        <button type="button" onClick={() => openEdit(app)} className="text-accent hover:underline text-xs">Edit</button>
                        <button type="button" onClick={() => handleDelete(app.id)} className="text-red-600 hover:underline text-xs">Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)} className="btn-secondary text-sm">← Prev</button>
              <span className="caption">Page {page + 1} of {totalPages}</span>
              <button type="button" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} className="btn-secondary text-sm">Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SortHeader({ label, sortKey: key, current, dir, onClick }: {
  label: string; sortKey: SortKey; current: SortKey; dir: SortDir; onClick: (k: SortKey) => void;
}) {
  const active = current === key;
  return (
    <th className="pb-3 pr-3 font-medium">
      <button type="button" onClick={() => onClick(key)} className="inline-flex items-center gap-1 hover:text-foreground">
        {label}
        {active && <span className="text-xs">{dir === "asc" ? "↑" : "↓"}</span>}
      </button>
    </th>
  );
}

function ViewToggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${active ? "bg-accent text-white dark:text-slate-950" : "text-muted hover:text-foreground"}`}>{children}</button>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="block"><span className="caption mb-1 block font-medium">{label}{required && " *"}</span>{children}</label>;
}
