import type Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import type { Application, ApplicationStatus } from "@/lib/types";
import type {
  ApplicationCreateInput,
  ApplicationUpdateInput,
} from "@/lib/validation/schemas";
import { todayISO } from "@/lib/utils/dates";

function emptyToNull(value: string | null | undefined): string | null {
  if (value === undefined) return undefined as unknown as null;
  return value === "" ? null : value;
}

function now() {
  return new Date().toISOString();
}

export function listApplications(
  db: Database.Database,
  userId: string
): Application[] {
  return db
    .prepare(
      "SELECT * FROM applications WHERE user_id = ? ORDER BY updated_at DESC"
    )
    .all(userId) as Application[];
}

export function getApplication(
  db: Database.Database,
  userId: string,
  id: string
): Application | null {
  return (
    (db
      .prepare("SELECT * FROM applications WHERE id = ? AND user_id = ?")
      .get(id, userId) as Application | undefined) ?? null
  );
}

export function createApplication(
  db: Database.Database,
  userId: string,
  input: ApplicationCreateInput
): Application {
  const id = uuidv4();
  const status = input.status ?? "applied";
  const timestamp = now();
  let dateApplied = emptyToNull(input.date_applied ?? null);
  const dateStatusChanged = status !== "saved" ? todayISO() : null;

  if (status !== "saved" && !dateApplied) {
    dateApplied = todayISO();
  }

  db.prepare(
    `INSERT INTO applications (id, user_id, company_name, role_title, platform, application_url, contact_id, job_description_text, followup_status, status, date_applied, date_status_changed, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    userId,
    input.company_name,
    input.role_title,
    input.platform ?? null,
    emptyToNull(input.application_url ?? null),
    input.contact_id ?? null,
    emptyToNull(input.job_description_text ?? null),
    input.followup_status ?? null,
    status,
    dateApplied,
    dateStatusChanged,
    emptyToNull(input.notes ?? null),
    timestamp,
    timestamp
  );

  return getApplication(db, userId, id)!;
}

export function updateApplication(
  db: Database.Database,
  userId: string,
  id: string,
  input: ApplicationUpdateInput
): Application {
  const existing = getApplication(db, userId, id);
  if (!existing) throw new Error("Application not found");

  const updates: string[] = [];
  const values: unknown[] = [];

  if (input.company_name !== undefined) {
    updates.push("company_name = ?");
    values.push(input.company_name);
  }
  if (input.role_title !== undefined) {
    updates.push("role_title = ?");
    values.push(input.role_title);
  }
  if (input.platform !== undefined) {
    updates.push("platform = ?");
    values.push(input.platform);
  }
  if (input.application_url !== undefined) {
    updates.push("application_url = ?");
    values.push(emptyToNull(input.application_url));
  }
  if (input.contact_id !== undefined) {
    updates.push("contact_id = ?");
    values.push(input.contact_id);
  }
  if (input.followup_status !== undefined) {
    updates.push("followup_status = ?");
    values.push(input.followup_status);
  }
  if (input.job_description_text !== undefined) {
    updates.push("job_description_text = ?");
    values.push(emptyToNull(input.job_description_text));
  }
  if (input.notes !== undefined) {
    updates.push("notes = ?");
    values.push(emptyToNull(input.notes));
  }
  if (input.date_applied !== undefined) {
    updates.push("date_applied = ?");
    values.push(emptyToNull(input.date_applied));
  }
  if (input.status !== undefined && input.status !== existing.status) {
    updates.push("status = ?");
    values.push(input.status);
    updates.push("date_status_changed = ?");
    values.push(todayISO());
    if (
      input.status !== "saved" &&
      existing.status === "saved" &&
      !input.date_applied &&
      !existing.date_applied
    ) {
      updates.push("date_applied = ?");
      values.push(todayISO());
    }
  }

  if (updates.length > 0) {
    updates.push("updated_at = ?");
    values.push(now());
    values.push(id, userId);
    db.prepare(
      `UPDATE applications SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`
    ).run(...values);
  }

  return getApplication(db, userId, id)!;
}

export function updateApplicationStatus(
  db: Database.Database,
  userId: string,
  id: string,
  status: ApplicationStatus
): Application {
  return updateApplication(db, userId, id, { status });
}

export function deleteApplication(
  db: Database.Database,
  userId: string,
  id: string
): void {
  db.prepare("DELETE FROM applications WHERE id = ? AND user_id = ?").run(
    id,
    userId
  );
}

export function getDashboardStats(
  db: Database.Database,
  userId: string,
  weekStartDate: string
): { totalApplications: number; totalInterviews: number; totalOffers: number; weekStartDate: string } {
  const rows = db
    .prepare("SELECT status FROM applications WHERE user_id = ?")
    .all(userId) as { status: string }[];

  const totalApplications = rows.length;
  const totalInterviews = rows.filter((a) =>
    ["interviewing", "offer"].includes(a.status)
  ).length;
  const totalOffers = rows.filter((a) => a.status === "offer").length;

  return { totalApplications, totalInterviews, totalOffers, weekStartDate };
}

export function getFollowUpsDueCount(
  db: Database.Database,
  userId: string
): number {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const cutoff = sevenDaysAgo.toISOString().slice(0, 10);

  const row = db
    .prepare(
      `SELECT COUNT(*) as count FROM applications
       WHERE user_id = ? AND status = 'applied'
       AND date_applied IS NOT NULL AND date_applied <= ?
       AND (followup_status IS NULL OR followup_status = 'no_response')`
    )
    .get(userId, cutoff) as { count: number };

  return row.count;
}
