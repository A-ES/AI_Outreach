"use client";

import { useEffect, useState } from "react";
import type { Application, Contact, ContactStatus, ContactWithApplication } from "@/lib/types";
import { CONTACT_STATUSES, CONTACT_STATUS_LABELS } from "@/lib/types";

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

      {loading ? (
        <p className="body-text">Loading contacts…</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="pb-3 pr-4 font-medium">Name</th>
                <th className="pb-3 pr-4 font-medium">Company</th>
                <th className="pb-3 pr-4 font-medium">Status</th>
                <th className="pb-3 pr-4 font-medium">Application</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr key={contact.id} className="border-b border-slate-100">
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
                        className="text-indigo-700 hover:underline"
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
              {contacts.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No contacts yet.
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
