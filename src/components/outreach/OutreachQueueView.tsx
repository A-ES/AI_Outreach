"use client";

import { useEffect, useState } from "react";
import type { Contact, OutreachEmailWithContact } from "@/lib/types";
import {
  OUTREACH_OUTCOME_LABELS,
  OUTREACH_STATUS_LABELS,
} from "@/lib/types";
import type { OutreachOutcome } from "@/lib/validation/outreach";
import { formatDate } from "@/lib/utils/dates";
import { EmptyState } from "@/components/ui/EmptyState";
import { SequentialLoading } from "@/components/ui/SequentialLoading";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-100",
  approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  sent: "bg-accent-soft text-accent",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
};

export function OutreachQueueView() {
  const [emails, setEmails] = useState<OutreachEmailWithContact[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [regenNote, setRegenNote] = useState<Record<string, string>>({});
  const [editDraft, setEditDraft] = useState<
    Record<string, { subject: string; body: string }>
  >({});

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [emailsRes, contactsRes] = await Promise.all([
        fetch("/api/outreach"),
        fetch("/api/contacts"),
      ]);
      const emailsData = await emailsRes.json();
      const contactsData = await contactsRes.json();
      if (!emailsRes.ok) throw new Error(emailsData.error ?? "Failed to load queue");
      if (!contactsRes.ok) throw new Error(contactsData.error ?? "Failed to load contacts");
      setEmails(emailsData.emails);
      setContacts(contactsData.contacts);

      const drafts: Record<string, { subject: string; body: string }> = {};
      for (const e of emailsData.emails as OutreachEmailWithContact[]) {
        drafts[e.id] = { subject: e.subject, body: e.body };
      }
      setEditDraft(drafts);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleGenerate() {
    if (!selectedContactId) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: selectedContactId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? data.validationErrors?.[0] ?? "Failed");
      setSelectedContactId("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveEdit(id: string) {
    const draft = editDraft[id];
    if (!draft) return;
    try {
      const res = await fetch(`/api/outreach/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save edit");
    }
  }

  async function handleAction(id: string, action: "approve" | "reject" | "send") {
    setError(null);
    try {
      const res = await fetch(`/api/outreach/${id}/${action}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Failed to ${action}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : `Failed to ${action}`);
    }
  }

  async function handleRegenerate(id: string) {
    const note = regenNote[id]?.trim();
    if (!note) {
      setError("Enter a regeneration note first");
      return;
    }
    setRegeneratingId(id);
    try {
      const res = await fetch(`/api/outreach/${id}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? data.validationErrors?.[0] ?? "Failed");
      setRegenNote((prev) => ({ ...prev, [id]: "" }));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to regenerate");
    } finally {
      setRegeneratingId(null);
    }
  }

  async function handleOutcome(
    id: string,
    outcome: OutreachOutcome | null,
    replyReceived: boolean
  ) {
    try {
      const res = await fetch(`/api/outreach/${id}/outcome`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome, reply_received: replyReceived }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update outcome");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update outcome");
    }
  }

  const queue = emails.filter((e) => e.status !== "sent");
  const sent = emails.filter((e) => e.status === "sent");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">Outreach Queue</h1>
        <p className="caption mt-1">
          Draft, review, and approve emails before sending — nothing sends automatically
        </p>
      </div>

      <section className="card space-y-3">
        <h2 className="section-heading">Generate new draft</h2>
        <div className="flex flex-wrap gap-2">
          <select
            value={selectedContactId}
            onChange={(e) => setSelectedContactId(e.target.value)}
            className="input-field max-w-md"
          >
            <option value="">Select contact…</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.company_name ? ` — ${c.company_name}` : ""}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || !selectedContactId}
            className="btn-primary"
          >
            {generating ? "Drafting…" : "Generate draft"}
          </button>
        </div>
        {generating && (
          <SequentialLoading
            steps={[
              "Reading contact context...",
              "Selecting relevant resume highlights...",
              "Drafting a concise outreach email...",
              "Checking the structure before saving...",
            ]}
          />
        )}
      </section>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {loading ? (
        <p className="body-text">Loading queue…</p>
      ) : (
        <>
          <section className="space-y-4">
            <h2 className="section-heading">Review queue</h2>
            {queue.length === 0 ? (
              <EmptyState
                title="No drafts waiting for review"
                description="Generated drafts that still need approval will appear here before anything can be sent."
              />
            ) : (
              queue.map((email) => (
                <DraftCard
                  key={email.id}
                  email={email}
                  draft={editDraft[email.id]}
                  regenNote={regenNote[email.id] ?? ""}
                  onDraftChange={(field, value) =>
                    setEditDraft((prev) => ({
                      ...prev,
                      [email.id]: { ...prev[email.id], [field]: value },
                    }))
                  }
                  onRegenNoteChange={(v) =>
                    setRegenNote((prev) => ({ ...prev, [email.id]: v }))
                  }
                  onSaveEdit={() => handleSaveEdit(email.id)}
                  onApprove={() => handleAction(email.id, "approve")}
                  onReject={() => handleAction(email.id, "reject")}
                  onSend={() => handleAction(email.id, "send")}
                  onRegenerate={() => handleRegenerate(email.id)}
                  regenerating={regeneratingId === email.id}
                />
              ))
            )}
          </section>

          <section className="space-y-4">
            <h2 className="section-heading">Sent</h2>
            {sent.length === 0 ? (
              <EmptyState
                title="No sent outreach yet"
                description="Approved emails move here after sending, where you can log replies and outcomes for analytics."
              />
            ) : (
              sent.map((email) => (
                <SentCard
                  key={email.id}
                  email={email}
                  onOutcome={(outcome, reply) =>
                    handleOutcome(email.id, outcome, reply)
                  }
                />
              ))
            )}
          </section>
        </>
      )}
    </div>
  );
}

function DraftCard({
  email,
  draft,
  regenNote,
  onDraftChange,
  onRegenNoteChange,
  onSaveEdit,
  onApprove,
  onReject,
  onSend,
  onRegenerate,
  regenerating,
}: {
  email: OutreachEmailWithContact;
  draft?: { subject: string; body: string };
  regenNote: string;
  onDraftChange: (field: "subject" | "body", value: string) => void;
  onRegenNoteChange: (v: string) => void;
  onSaveEdit: () => void;
  onApprove: () => void;
  onReject: () => void;
  onSend: () => void;
  onRegenerate: () => void;
  regenerating: boolean;
}) {
  const isDraft = email.status === "draft";
  const isApproved = email.status === "approved";
  const canSend = isApproved;

  return (
    <article className="card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium text-foreground">
            {email.contacts?.name ?? "Unknown contact"}
            {email.contacts?.company_name && (
              <span className="caption ml-2">@ {email.contacts.company_name}</span>
            )}
          </p>
          <p className="caption">{formatDate(email.date_drafted.slice(0, 10))}</p>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[email.status]}`}
        >
          {OUTREACH_STATUS_LABELS[email.status]}
        </span>
      </div>

      {isDraft ? (
        <>
          <input
            value={draft?.subject ?? email.subject}
            onChange={(e) => onDraftChange("subject", e.target.value)}
            className="input-field font-medium"
          />
          <textarea
            rows={8}
            value={draft?.body ?? email.body}
            onChange={(e) => onDraftChange("body", e.target.value)}
            className="input-field font-mono text-sm"
          />
          <button type="button" onClick={onSaveEdit} className="btn-secondary text-sm">
            Save edits
          </button>
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-foreground">{email.subject}</p>
          <pre className="body-text whitespace-pre-wrap font-sans">{email.body}</pre>
        </>
      )}

      {regenerating && (
        <SequentialLoading
          steps={[
            "Applying your revision note...",
            "Rebalancing tone and length...",
            "Validating the regenerated draft...",
          ]}
        />
      )}

      <div className="flex flex-wrap gap-2 border-t border-border pt-3">
        {isDraft && (
          <>
            <button type="button" onClick={onApprove} className="btn-primary text-sm">
              Approve
            </button>
            <button type="button" onClick={onReject} className="btn-secondary text-sm">
              Reject
            </button>
          </>
        )}
        {email.status === "rejected" && (
          <p className="caption w-full text-red-700">Rejected — regenerate or discard</p>
        )}
        <button
          type="button"
          onClick={onSend}
          disabled={!canSend}
          title={
            canSend
              ? "Send via Resend"
              : "Only approved drafts can be sent (enforced server-side too)"
          }
          className="btn-primary text-sm disabled:cursor-not-allowed disabled:opacity-40"
        >
          Send
        </button>
      </div>

      {(isDraft || email.status === "rejected") && (
        <div className="flex gap-2">
          <input
            placeholder='Regenerate note, e.g. "make it shorter"'
            value={regenNote}
            onChange={(e) => onRegenNoteChange(e.target.value)}
            className="input-field text-sm"
          />
          <button type="button" onClick={onRegenerate} className="btn-secondary shrink-0 text-sm">
            {regenerating ? "Regenerating..." : "Regenerate"}
          </button>
        </div>
      )}
    </article>
  );
}

function SentCard({
  email,
  onOutcome,
}: {
  email: OutreachEmailWithContact;
  onOutcome: (outcome: OutreachOutcome | null, replyReceived: boolean) => void;
}) {
  return (
    <article className="card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium text-foreground">{email.contacts?.name}</p>
          <p className="caption">
            Sent {email.date_sent ? formatDate(email.date_sent.slice(0, 10)) : "—"}
          </p>
        </div>
        {email.outcome && (
          <span className="caption rounded-full bg-panel-subtle px-2 py-0.5">
            {OUTREACH_OUTCOME_LABELS[email.outcome]}
          </span>
        )}
      </div>
      <p className="text-sm font-medium text-foreground">{email.subject}</p>
      <pre className="body-text whitespace-pre-wrap font-sans text-muted">{email.body}</pre>
      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={email.reply_received}
            onChange={(e) => onOutcome(email.outcome, e.target.checked)}
          />
          Reply received
        </label>
        <select
          value={email.outcome ?? ""}
          onChange={(e) =>
            onOutcome(
              (e.target.value as OutreachOutcome) || null,
              email.reply_received
            )
          }
          className="input-field max-w-xs text-sm"
        >
          <option value="">Log outcome…</option>
          {Object.entries(OUTREACH_OUTCOME_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
      </div>
    </article>
  );
}
