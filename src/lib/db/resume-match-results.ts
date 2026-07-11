import type Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import type { ResumeMatchResult } from "@/lib/types";
import type { ResumeMatchLLMOutput } from "@/lib/validation/resume-match";

export interface InsertResumeMatchResultInput {
  user_id: string;
  application_id: string | null;
  resume_id: string | null;
  output: ResumeMatchLLMOutput;
}

export function insertResumeMatchResult(
  db: Database.Database,
  input: InsertResumeMatchResultInput
): ResumeMatchResult {
  const id = uuidv4();
  const timestamp = new Date().toISOString();
  const { output } = input;

  db.prepare(
    `INSERT INTO resume_match_results (id, user_id, application_id, resume_id, match_score, matched_keywords, missing_keywords, reasoning_trace, confidence_label, confidence_reason, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.user_id,
    input.application_id,
    input.resume_id,
    output.match_score,
    JSON.stringify(output.matched_keywords),
    JSON.stringify(output.missing_keywords),
    JSON.stringify(output.reasoning_trace),
    output.confidence_label,
    output.confidence_reason,
    timestamp
  );

  return parseRow(
    db.prepare("SELECT * FROM resume_match_results WHERE id = ?").get(id) as Record<string, unknown>
  );
}

export function listResumeMatchResultsByApplication(
  db: Database.Database,
  userId: string,
  applicationId: string
): ResumeMatchResult[] {
  const rows = db
    .prepare(
      "SELECT * FROM resume_match_results WHERE user_id = ? AND application_id = ? ORDER BY created_at DESC"
    )
    .all(userId, applicationId) as Record<string, unknown>[];
  return rows.map(parseRow);
}

export function getResumeMatchResult(
  db: Database.Database,
  userId: string,
  id: string
): ResumeMatchResult | null {
  const row = db
    .prepare("SELECT * FROM resume_match_results WHERE id = ? AND user_id = ?")
    .get(id, userId) as Record<string, unknown> | undefined;
  return row ? parseRow(row) : null;
}

function parseRow(row: Record<string, unknown>): ResumeMatchResult {
  return {
    ...row,
    matched_keywords: JSON.parse(row.matched_keywords as string),
    missing_keywords: JSON.parse(row.missing_keywords as string),
    reasoning_trace: JSON.parse(row.reasoning_trace as string),
  } as ResumeMatchResult;
}
