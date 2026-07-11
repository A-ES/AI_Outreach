import type Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import type { AtsCheckResultRecord } from "@/lib/types";
import type { AtsCheckResult } from "@/lib/validation/ats";

export function insertAtsCheckResult(
  db: Database.Database,
  input: {
    user_id: string;
    resume_id: string | null;
    result: AtsCheckResult;
  }
): AtsCheckResultRecord {
  const id = uuidv4();
  const timestamp = new Date().toISOString();

  db.prepare(
    `INSERT INTO ats_check_results (id, user_id, resume_id, overall_pass, checks, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.user_id,
    input.resume_id,
    input.result.overall_pass ? 1 : 0,
    JSON.stringify(input.result.checks),
    timestamp
  );

  return parseRow(
    db.prepare("SELECT * FROM ats_check_results WHERE id = ?").get(id) as Record<string, unknown>
  );
}

export function listAtsCheckResults(
  db: Database.Database,
  userId: string,
  resumeId?: string | null
): AtsCheckResultRecord[] {
  let sql = "SELECT * FROM ats_check_results WHERE user_id = ?";
  const params: unknown[] = [userId];

  if (resumeId) {
    sql += " AND resume_id = ?";
    params.push(resumeId);
  }
  sql += " ORDER BY created_at DESC";

  const rows = db.prepare(sql).all(...params) as Record<string, unknown>[];
  return rows.map(parseRow);
}

function parseRow(row: Record<string, unknown>): AtsCheckResultRecord {
  return {
    ...row,
    overall_pass: Boolean(row.overall_pass),
    checks: JSON.parse(row.checks as string),
  } as AtsCheckResultRecord;
}

export function deleteAtsCheckResult(
  db: Database.Database,
  userId: string,
  id: string
): void {
  db.prepare("DELETE FROM ats_check_results WHERE id = ? AND user_id = ?").run(id, userId);
}
