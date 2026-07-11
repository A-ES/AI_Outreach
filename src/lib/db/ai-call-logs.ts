import type Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import type { AiCallLog, AiCallLogInsert } from "@/lib/llm/types";

export function insertAiCallLog(
  db: Database.Database,
  log: AiCallLogInsert
): AiCallLog {
  const id = uuidv4();
  const timestamp = new Date().toISOString();

  db.prepare(
    `INSERT INTO ai_call_logs (id, user_id, feature_name, prompt_text, model_name, temperature, input_tokens, output_tokens, latency_ms, confidence_score, validation_passed, validation_retry_count, raw_response_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    log.user_id,
    log.feature_name,
    log.prompt_text,
    log.model_name,
    log.temperature ?? null,
    log.input_tokens ?? 0,
    log.output_tokens ?? 0,
    log.latency_ms ?? 0,
    log.confidence_score ?? null,
    log.validation_passed ? 1 : 0,
    log.validation_retry_count ?? 0,
    log.raw_response_json ? JSON.stringify(log.raw_response_json) : null,
    timestamp
  );

  return {
    id,
    ...log,
    created_at: timestamp,
  } as AiCallLog;
}

export function listAiCallLogs(
  db: Database.Database,
  userId: string,
  limit = 50
): AiCallLog[] {
  const rows = db
    .prepare(
      "SELECT * FROM ai_call_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?"
    )
    .all(userId, limit) as Array<Record<string, unknown>>;

  return rows.map((row) => ({
    ...row,
    validation_passed: Boolean(row.validation_passed),
    raw_response_json: row.raw_response_json
      ? JSON.parse(row.raw_response_json as string)
      : null,
  })) as AiCallLog[];
}
