"use client";

import { useEffect, useState } from "react";
import type { Application, Contact, ContactStatus, ContactWithApplication } from "@/lib/types";
import { CONTACT_STATUSES, CONTACT_STATUS_LABELS } from "@/lib/types";
import { EmptyState } from "@/components/ui/EmptyState";

interface ImportPreviewRow {
  row_number: number;
  input: {
    name: string;
    company_name: string | null;
    role_title: string | null;
    email: string | null;
    linkedin_url: string | null;
  };
  status: "ready" | "duplicate" | "invalid";
  errors: string[];
}

interface ImportSummary {
  succeeded: number;
  failed: number;
  skipped_duplicates: number;
  ready: number;
}

const emptyForm = {
  name: "",
  company_name: "",
  role_title: "",
  email: "",
  linkedin_url: "",
  status: "not_contacted" as ContactStatus,
  application_id: "",
};

export function ContactsView() {
  const [contacts, setContacts] = useState<ContactWithApplication[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [importPreview, setImportPreview] = useState<ImportPreviewRow[]>([]);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [importing, setImporting] = useState(false);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [contactsRes, appsRes] = await Promise.all([
        fetch("/api/contacts"),
        fetch("/api/applications"),
      ]);
      const contactsData = await contactsRes.json();
      const appsData = await appsRes.json();
      if (!contactsRes.ok) throw new Error(contactsData.error ?? "Failed to load contacts");
      if (!appsRes.ok) throw new Error(appsData.error ?? "Failed to load applications");
      setContacts(contactsData.contacts);
      setApplications(appsData.applications);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(contact: Contact) {
    setEditingId(contact.id);
    setForm({
      name: contact.name,
      company_name: contact.company_name ?? "",
      role_title: contact.role_title ?? "",
      email: contact.email ?? "",
      linkedin_url: contact.linkedin_url ?? "",
      status: contact.status,
      application_id: contact.application_id ?? "",
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      name: form.name,
      company_name: form.company_name || null,
      role_title: form.role_title || null,
      email: form.email || null,
      linkedin_url: form.linkedin_url || null,
      status: form.status,
      application_id: form.application_id || null,
    };

    try {
      const res = await fetch(
        editingId ? `/api/contacts/${editingId}` : "/api/contacts",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save contact");

      setShowForm(false);
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save contact");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this contact?")) return;
    try {
      const res = await fetch(`/api/contacts/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to delete");
      }
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete contact");
    }
  }

  async function previewImport() {
    setImporting(true);
    setError(null);
    try {
      const res = await fetch("/api/contacts/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText, commit: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to preview import");
      setImportPreview(data.preview);
      setImportSummary(data.summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to preview import");
    } finally {
      setImporting(false);
    }
  }

  async function commitImport() {
    setImporting(true);
    setError(null);
    try {
      const res = await fetch("/api/contacts/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText, commit: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to import contacts");
      setImportPreview(data.preview);
      setImportSummary(data.summary);
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to import contacts");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Contacts</h1>
          <p className="caption mt-1">People in your network and outreach pipeline</p>
        </div>
        <button type="button" onClick={openCreate} className="btn-primary">
          Add contact
        </button>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {showForm && (
        <section className="card">
          <h2 className="section-heading mb-4">
            {editingId ? "Edit contact" : "New contact"}
          </h2>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" required>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input-field"
              />
            </Field>
            <Field label="Company">
              <input
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                className="input-field"
              />
            </Field>
            <Field label="Role">
              <input
                value={form.role_title}
                onChange={(e) => setForm({ ...form, role_title: e.target.value })}
                className="input-field"
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input-field"
              />
            </Field>
            <Field label="LinkedIn URL">
              <input
                type="url"
                value={form.linkedin_url}
                onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })}
                className="input-field"
                placeholder="https://linkedin.com/in/..."
              />
            </Field>
            <Field label="Status">
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as ContactStatus })
                }
                className="input-field"
              >
                {CONTACT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {CONTACT_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Linked application (optional)">
                <select
                  value={form.application_id}
                  onChange={(e) =>
                    setForm({ ...form, application_id: e.target.value })
                  }
                  className="input-field"
                >
                  <option value="">None</option>
                  {applications.map((app) => (
                    <option key={app.id} value={app.id}>
                      {app.company_name} — {app.role_title}
                    </option>
                  ))}
                </select>
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

      <section className="card space-y-4">
        <div>
          <h2 className="section-heading">CSV bulk import</h2>
          <p className="caption mt-1">
            Import your own vetted contacts. This only creates contact records; sending remains one-at-a-time through the outreach review queue.
          </p>
        </div>
        <textarea
          rows={5}
          value={csvText}
          onChange={(e) => {
            setCsvText(e.target.value);
            setImportPreview([]);
            setImportSummary(null);
          }}
          className="input-field font-mono text-xs"
          placeholder="name,company,role,email,LinkedIn URL&#10;Jane Doe,Acme,Engineering Manager,jane@example.com,https://linkedin.com/in/jane"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={previewImport}
            disabled={importing || !csvText.trim()}
            className="btn-secondary"
          >
            {importing ? "Checking..." : "Preview import"}
          </button>
          <button
            type="button"
            onClick={commitImport}
            disabled={
              importing ||
              !importSummary ||
              importSummary.ready === 0 ||
              importSummary.succeeded > 0
            }
            className="btn-primary"
          >
            Import ready contacts
          </button>
        </div>
        {importSummary && (
          <div className="grid gap-3 sm:grid-cols-4">
            <ImportMetric label="Ready" value={importSummary.ready} />
            <ImportMetric label="Succeeded" value={importSummary.succeeded} />
            <ImportMetric label="Failed" value={importSummary.failed} />
            <ImportMetric
              label="Skipped duplicates"
              value={importSummary.skipped_duplicates}
            />
          </div>
        )}
        {importPreview.length > 0 && (
          <div className="overflow-x-auto rounded-card border border-border">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-panel-subtle text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Row</th>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Company</th>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {importPreview.map((row) => (
                  <tr key={row.row_number} className="border-t border-border">
                    <td className="px-3 py-2">{row.row_number}</td>
                    <td className="px-3 py-2">{row.input.name || "—"}</td>
                    <td className="px-3 py-2">{row.input.company_name || "—"}</td>
                    <td className="px-3 py-2">{row.input.email || "—"}</td>
                    <td className="px-3 py-2">
                      <span className={importStatusClass(row.status)}>
                        {row.status}
                      </span>
                      {row.errors.length > 0 && (
                        <p className="caption mt-1">{row.errors.join(" ")}</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {loading ? (
        <p className="body-text">Loading contacts…</p>
      ) : contacts.length === 0 ? (
        <EmptyState
          title="No contacts yet"
          description="Add recruiters, hiring managers, friends, and warm leads here, then connect them to applications when relevant."
          action={
            <button type="button" onClick={openCreate} className="btn-primary">
              Add contact
            </button>
          }
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="pb-3 pr-4 font-medium">Name</th>
                <th className="pb-3 pr-4 font-medium">Company</th>
                <th className="pb-3 pr-4 font-medium">Status</th>
                <th className="pb-3 pr-4 font-medium">Application</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr key={contact.id} className="border-b border-border/70">
                  <td className="py-3 pr-4 font-medium">{contact.name}</td>
                  <td className="py-3 pr-4">{contact.company_name ?? "—"}</td>
                  <td className="py-3 pr-4">
                    {CONTACT_STATUS_LABELS[contact.status]}
                  </td>
                  <td className="py-3 pr-4">
                    {contact.applications
                      ? `${contact.applications.company_name} — ${contact.applications.role_title}`
                      : "—"}
                  </td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(contact)}
                        className="text-accent hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(contact.id)}
                        className="text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ImportMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-card border border-border bg-panel-subtle p-3">
      <p className="caption">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function importStatusClass(status: ImportPreviewRow["status"]) {
  const base = "status-pill capitalize";
  if (status === "ready") {
    return `${base} bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200`;
  }
  if (status === "duplicate") {
    return `${base} bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-100`;
  }
  return `${base} bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200`;
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
