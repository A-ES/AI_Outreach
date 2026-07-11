import type Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import type { Resume } from "@/lib/types";
import type { ResumeContent } from "@/lib/validation/resume";

function now() {
  return new Date().toISOString();
}

function parseResume(row: Record<string, unknown>): Resume {
  return {
    ...row,
    content_json: JSON.parse(row.content_json as string),
    is_base_resume: Boolean(row.is_base_resume),
  } as Resume;
}

export function listResumes(
  db: Database.Database,
  userId: string
): Resume[] {
  const rows = db
    .prepare("SELECT * FROM resumes WHERE user_id = ? ORDER BY created_at DESC")
    .all(userId) as Record<string, unknown>[];
  return rows.map(parseResume);
}

export function getResume(
  db: Database.Database,
  userId: string,
  id: string
): Resume | null {
  const row = db
    .prepare("SELECT * FROM resumes WHERE id = ? AND user_id = ?")
    .get(id, userId) as Record<string, unknown> | undefined;
  return row ? parseResume(row) : null;
}

export function getBaseResume(
  db: Database.Database,
  userId: string
): Resume | null {
  const row = db
    .prepare("SELECT * FROM resumes WHERE user_id = ? AND is_base_resume = 1")
    .get(userId) as Record<string, unknown> | undefined;
  return row ? parseResume(row) : null;
}

export function createResume(
  db: Database.Database,
  userId: string,
  input: {
    version_label: string;
    content_json: ResumeContent;
    is_base_resume?: boolean;
    tailored_for_application_id?: string | null;
  }
): Resume {
  const id = uuidv4();

  if (input.is_base_resume) {
    db.prepare(
      "UPDATE resumes SET is_base_resume = 0 WHERE user_id = ? AND is_base_resume = 1"
    ).run(userId);
  }

  db.prepare(
    `INSERT INTO resumes (id, user_id, version_label, content_json, is_base_resume, tailored_for_application_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    userId,
    input.version_label,
    JSON.stringify(input.content_json),
    input.is_base_resume ? 1 : 0,
    input.tailored_for_application_id ?? null,
    now()
  );

  return getResume(db, userId, id)!;
}

export function updateResume(
  db: Database.Database,
  userId: string,
  id: string,
  input: { version_label?: string; content_json?: ResumeContent }
): Resume {
  const updates: string[] = [];
  const values: unknown[] = [];

  if (input.version_label !== undefined) {
    updates.push("version_label = ?");
    values.push(input.version_label);
  }
  if (input.content_json !== undefined) {
    updates.push("content_json = ?");
    values.push(JSON.stringify(input.content_json));
  }

  if (updates.length > 0) {
    values.push(id, userId);
    db.prepare(`UPDATE resumes SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`).run(...values);
  }

  return getResume(db, userId, id)!;
}

export function setBaseResume(
  db: Database.Database,
  userId: string,
  id: string
): Resume {
  const existing = getResume(db, userId, id);
  if (!existing) throw new Error("Resume not found");

  db.prepare(
    "UPDATE resumes SET is_base_resume = 0 WHERE user_id = ? AND is_base_resume = 1"
  ).run(userId);

  db.prepare(
    "UPDATE resumes SET is_base_resume = 1, tailored_for_application_id = NULL WHERE id = ? AND user_id = ?"
  ).run(id, userId);

  return getResume(db, userId, id)!;
}

export function deleteResume(
  db: Database.Database,
  userId: string,
  id: string
): void {
  db.prepare("DELETE FROM resumes WHERE id = ? AND user_id = ?").run(id, userId);
}

export function resumeContentToText(content: ResumeContent): string {
  return JSON.stringify(content, null, 2);
}
