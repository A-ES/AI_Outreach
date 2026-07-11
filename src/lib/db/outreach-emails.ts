import type Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import type { OutreachEmail, OutreachEmailWithContact } from "@/lib/types";
import type { OutreachEmailStatus, OutreachOutcome } from "@/lib/validation/outreach";
import {
  assertCanEdit,
  assertCanSend,
  canTransition,
} from "@/lib/validation/outreach";

function now() {
  return new Date().toISOString();
}

function parseOutreachRow(row: Record<string, unknown>): OutreachEmail {
  return {
    ...row,
    reply_received: Boolean(row.reply_received),
  } as OutreachEmail;
}

function parseOutreachWithContact(row: Record<string, unknown>): OutreachEmailWithContact {
  const email = parseOutreachRow(row);
  const contacts = row.contact_name
    ? {
        name: row.contact_name as string,
        email: row.contact_email as string | null,
        company_name: row.contact_company_name as string | null,
        role_title: row.contact_role_title as string | null,
      }
    : null;
  return { ...email, contacts } as OutreachEmailWithContact;
}

const JOIN_QUERY = `
  SELECT oe.*,
    c.name AS contact_name, c.email AS contact_email,
    c.company_name AS contact_company_name, c.role_title AS contact_role_title
  FROM outreach_emails oe
  LEFT JOIN contacts c ON oe.contact_id = c.id
`;

export function listOutreachEmails(
  db: Database.Database,
  userId: string,
  status?: OutreachEmailStatus
): OutreachEmailWithContact[] {
  let sql = `${JOIN_QUERY} WHERE oe.user_id = ?`;
  const params: unknown[] = [userId];

  if (status) {
    sql += " AND oe.status = ?";
    params.push(status);
  }
  sql += " ORDER BY oe.updated_at DESC";

  const rows = db.prepare(sql).all(...params) as Record<string, unknown>[];
  return rows.map(parseOutreachWithContact);
}

export function getOutreachEmail(
  db: Database.Database,
  userId: string,
  id: string
): OutreachEmailWithContact | null {
  const row = db
    .prepare(`${JOIN_QUERY} WHERE oe.id = ? AND oe.user_id = ?`)
    .get(id, userId) as Record<string, unknown> | undefined;
  return row ? parseOutreachWithContact(row) : null;
}

export function createOutreachEmail(
  db: Database.Database,
  userId: string,
  input: {
    contact_id: string;
    application_id: string | null;
    subject: string;
    body: string;
  }
): OutreachEmail {
  const id = uuidv4();
  const timestamp = now();

  db.prepare(
    `INSERT INTO outreach_emails (id, user_id, contact_id, application_id, subject, body, status, date_drafted, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)`
  ).run(id, userId, input.contact_id, input.application_id, input.subject, input.body, timestamp, timestamp, timestamp);

  return parseOutreachRow(
    db.prepare("SELECT * FROM outreach_emails WHERE id = ?").get(id) as Record<string, unknown>
  );
}

export function updateOutreachDraftContent(
  db: Database.Database,
  userId: string,
  id: string,
  input: { subject?: string; body?: string }
): OutreachEmail {
  const existing = getOutreachEmail(db, userId, id);
  if (!existing) throw new Error("Outreach email not found");
  assertCanEdit(existing.status);

  const updates: string[] = [];
  const values: unknown[] = [];
  if (input.subject !== undefined) { updates.push("subject = ?"); values.push(input.subject); }
  if (input.body !== undefined) { updates.push("body = ?"); values.push(input.body); }

  if (updates.length > 0) {
    updates.push("updated_at = ?");
    values.push(now(), id, userId);
    db.prepare(`UPDATE outreach_emails SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`).run(...values);
  }

  return parseOutreachRow(
    db.prepare("SELECT * FROM outreach_emails WHERE id = ?").get(id) as Record<string, unknown>
  );
}

function transitionStatus(
  db: Database.Database,
  userId: string,
  id: string,
  toStatus: OutreachEmailStatus,
  extra?: Record<string, unknown>
): OutreachEmail {
  const existing = getOutreachEmail(db, userId, id);
  if (!existing) throw new Error("Outreach email not found");

  if (!canTransition(existing.status, toStatus)) {
    throw new Error(`Invalid status transition: "${existing.status}" → "${toStatus}"`);
  }

  const updates: string[] = ["status = ?", "updated_at = ?"];
  const values: unknown[] = [toStatus, now()];

  if (extra) {
    for (const [key, val] of Object.entries(extra)) {
      updates.push(`${key} = ?`);
      values.push(val);
    }
  }

  values.push(id, userId);
  db.prepare(`UPDATE outreach_emails SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`).run(...values);

  return parseOutreachRow(
    db.prepare("SELECT * FROM outreach_emails WHERE id = ?").get(id) as Record<string, unknown>
  );
}

export function approveOutreachEmail(db: Database.Database, userId: string, id: string): OutreachEmail {
  return transitionStatus(db, userId, id, "approved");
}

export function rejectOutreachEmail(db: Database.Database, userId: string, id: string): OutreachEmail {
  return transitionStatus(db, userId, id, "rejected");
}

export function markOutreachSent(db: Database.Database, userId: string, id: string): OutreachEmail {
  const existing = getOutreachEmail(db, userId, id);
  if (!existing) throw new Error("Outreach email not found");
  assertCanSend(existing.status);
  return transitionStatus(db, userId, id, "sent", { date_sent: now() });
}

export function updateOutreachFromRegeneration(
  db: Database.Database,
  userId: string,
  id: string,
  input: { subject: string; body: string }
): OutreachEmail {
  const existing = getOutreachEmail(db, userId, id);
  if (!existing) throw new Error("Outreach email not found");

  db.prepare(
    `UPDATE outreach_emails SET subject = ?, body = ?, status = 'draft', date_drafted = ?, updated_at = ? WHERE id = ? AND user_id = ?`
  ).run(input.subject, input.body, now(), now(), id, userId);

  return parseOutreachRow(
    db.prepare("SELECT * FROM outreach_emails WHERE id = ?").get(id) as Record<string, unknown>
  );
}

export function updateOutreachOutcome(
  db: Database.Database,
  userId: string,
  id: string,
  input: { reply_received?: boolean; outcome?: OutreachOutcome | null }
): OutreachEmail {
  const existing = getOutreachEmail(db, userId, id);
  if (!existing) throw new Error("Outreach email not found");
  if (existing.status !== "sent") {
    throw new Error("Outcomes can only be logged for sent emails");
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  if (input.reply_received !== undefined) {
    updates.push("reply_received = ?");
    values.push(input.reply_received ? 1 : 0);
  }
  if (input.outcome !== undefined) {
    updates.push("outcome = ?");
    values.push(input.outcome);
  }

  if (updates.length > 0) {
    updates.push("updated_at = ?");
    values.push(now(), id, userId);
    db.prepare(`UPDATE outreach_emails SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`).run(...values);
  }

  return parseOutreachRow(
    db.prepare("SELECT * FROM outreach_emails WHERE id = ?").get(id) as Record<string, unknown>
  );
}
