import type Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import type { Contact, ContactWithApplication } from "@/lib/types";
import type {
  ContactCreateInput,
  ContactUpdateInput,
} from "@/lib/validation/schemas";

function emptyToNull(value: string | null | undefined): string | null {
  if (value === undefined) return undefined as unknown as null;
  return value === "" ? null : value;
}

function now() {
  return new Date().toISOString();
}

export function listContacts(
  db: Database.Database,
  userId: string
): ContactWithApplication[] {
  const rows = db
    .prepare(
      `SELECT c.*, a.company_name AS app_company_name, a.role_title AS app_role_title
       FROM contacts c
       LEFT JOIN applications a ON c.application_id = a.id
       WHERE c.user_id = ?
       ORDER BY c.updated_at DESC`
    )
    .all(userId) as Array<Contact & { app_company_name: string | null; app_role_title: string | null }>;

  return rows.map((row) => ({
    ...row,
    applications: row.app_company_name
      ? { company_name: row.app_company_name, role_title: row.app_role_title! }
      : null,
    app_company_name: undefined,
    app_role_title: undefined,
  })) as unknown as ContactWithApplication[];
}

export function getContact(
  db: Database.Database,
  userId: string,
  id: string
): Contact | null {
  return (
    (db
      .prepare("SELECT * FROM contacts WHERE id = ? AND user_id = ?")
      .get(id, userId) as Contact | undefined) ?? null
  );
}

export function createContact(
  db: Database.Database,
  userId: string,
  input: ContactCreateInput
): Contact {
  const id = uuidv4();
  const timestamp = now();

  db.prepare(
    `INSERT INTO contacts (id, user_id, application_id, name, company_name, role_title, email, linkedin_url, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    userId,
    input.application_id ?? null,
    input.name,
    emptyToNull(input.company_name ?? null),
    emptyToNull(input.role_title ?? null),
    emptyToNull(input.email ?? null),
    emptyToNull(input.linkedin_url ?? null),
    input.status ?? "not_contacted",
    timestamp,
    timestamp
  );

  return getContact(db, userId, id)!;
}

export function updateContact(
  db: Database.Database,
  userId: string,
  id: string,
  input: ContactUpdateInput
): Contact {
  const updates: string[] = [];
  const values: unknown[] = [];

  if (input.name !== undefined) { updates.push("name = ?"); values.push(input.name); }
  if (input.company_name !== undefined) { updates.push("company_name = ?"); values.push(emptyToNull(input.company_name)); }
  if (input.role_title !== undefined) { updates.push("role_title = ?"); values.push(emptyToNull(input.role_title)); }
  if (input.email !== undefined) { updates.push("email = ?"); values.push(emptyToNull(input.email)); }
  if (input.linkedin_url !== undefined) { updates.push("linkedin_url = ?"); values.push(emptyToNull(input.linkedin_url)); }
  if (input.status !== undefined) { updates.push("status = ?"); values.push(input.status); }
  if (input.application_id !== undefined) { updates.push("application_id = ?"); values.push(input.application_id); }

  if (updates.length > 0) {
    updates.push("updated_at = ?");
    values.push(now());
    values.push(id, userId);
    db.prepare(`UPDATE contacts SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`).run(...values);
  }

  return getContact(db, userId, id)!;
}

export function deleteContact(
  db: Database.Database,
  userId: string,
  id: string
): void {
  db.prepare("DELETE FROM contacts WHERE id = ? AND user_id = ?").run(id, userId);
}
