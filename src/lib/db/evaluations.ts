import type Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import type {
  AiEvaluationMetrics,
  EvalRunResult,
  EvalTestCase,
} from "@/lib/types";

const DEEPSEEK_PRICING_PER_MILLION = {
  "deepseek-v4-flash": { input: 0.14, output: 0.28 },
  "deepseek-v4-pro": { input: 0.55, output: 2.19 },
};

export function listEvalTestCases(db: Database.Database): EvalTestCase[] {
  const rows = db
    .prepare("SELECT * FROM eval_test_cases ORDER BY created_at ASC")
    .all() as Record<string, unknown>[];

  return rows.map((row) => ({
    ...row,
    expected_keywords: JSON.parse(row.expected_keywords as string),
    expected_missing_skills: JSON.parse(row.expected_missing_skills as string),
  })) as EvalTestCase[];
}

export function insertEvalRunResult(
  db: Database.Database,
  input: Omit<EvalRunResult, "id">
): EvalRunResult {
  const id = uuidv4();

  db.prepare(
    `INSERT INTO eval_run_results (id, eval_test_case_id, run_timestamp, actual_match_score, keyword_precision, keyword_recall, passed, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.eval_test_case_id,
    input.run_timestamp,
    input.actual_match_score,
    input.keyword_precision,
    input.keyword_recall,
    input.passed ? 1 : 0,
    input.notes ?? null
  );

  const row = db.prepare("SELECT * FROM eval_run_results WHERE id = ?").get(id) as Record<string, unknown>;
  return { ...row, passed: Boolean(row.passed) } as EvalRunResult;
}

export function getAiEvaluationMetrics(db: Database.Database): AiEvaluationMetrics {
  const evalRows = db
    .prepare("SELECT * FROM eval_run_results ORDER BY run_timestamp DESC")
    .all() as Record<string, unknown>[];

  const results = evalRows.map((row) => ({
    ...row,
    passed: Boolean(row.passed),
  })) as EvalRunResult[];

  const logs = db
    .prepare(
      "SELECT feature_name, model_name, input_tokens, output_tokens, latency_ms, confidence_score, validation_passed, raw_response_json FROM ai_call_logs"
    )
    .all() as Array<Record<string, unknown>>;

  const latestRunTimestamp = (results[0]?.run_timestamp as string) ?? null;
  const latestResults = latestRunTimestamp
    ? results.filter((r) => r.run_timestamp === latestRunTimestamp)
    : [];
  const passedCount = latestResults.filter((r) => r.passed).length;

  const aiLogs = logs.map((log) => ({
    feature_name: log.feature_name as string,
    model_name: log.model_name as string,
    input_tokens: log.input_tokens as number,
    output_tokens: log.output_tokens as number,
    latency_ms: log.latency_ms as number,
    confidence_score: log.confidence_score as number | null,
    validation_passed: Boolean(log.validation_passed),
    raw_response_json: log.raw_response_json
      ? JSON.parse(log.raw_response_json as string)
      : null,
  }));

  const confidenceValues = aiLogs
    .map((log) => log.confidence_score)
    .filter((score): score is number => typeof score === "number");

  const hallucinationLogs = aiLogs.filter(
    (log) => log.feature_name === "hallucination_check" && log.validation_passed
  );

  return {
    latest_run_timestamp: latestRunTimestamp,
    eval_case_count: latestResults.length,
    resume_match_accuracy:
      latestResults.length > 0 ? (passedCount / latestResults.length) * 100 : 0,
    average_keyword_precision: average(latestResults.map((r) => r.keyword_precision)),
    average_keyword_recall: average(latestResults.map((r) => r.keyword_recall)),
    tailoring_hallucinations_detected: hallucinationLogs.reduce(
      (sum, log) => sum + countFlaggedClaims(log.raw_response_json),
      0
    ),
    average_generation_time_ms: average(aiLogs.map((log) => log.latency_ms)),
    average_cost_per_request: average(aiLogs.map(estimateLogCost)),
    average_confidence_score:
      confidenceValues.length > 0 ? average(confidenceValues) : null,
    total_eval_runs: new Set(results.map((r) => r.run_timestamp)).size,
  };
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function estimateLogCost(log: { model_name: string; input_tokens: number; output_tokens: number }) {
  const pricing =
    DEEPSEEK_PRICING_PER_MILLION[
      log.model_name as keyof typeof DEEPSEEK_PRICING_PER_MILLION
    ] ?? DEEPSEEK_PRICING_PER_MILLION["deepseek-v4-flash"];
  return (
    (log.input_tokens / 1_000_000) * pricing.input +
    (log.output_tokens / 1_000_000) * pricing.output
  );
}

function countFlaggedClaims(rawResponse: unknown): number {
  const rawResponses =
    typeof rawResponse === "object" &&
    rawResponse !== null &&
    "attempts" in rawResponse &&
    Array.isArray((rawResponse as { attempts?: unknown[] }).attempts)
      ? (rawResponse as { attempts: unknown[] }).attempts
      : [rawResponse];

  const latest = rawResponses.at(-1);
  const content = extractMessageContent(latest);
  if (!content) return 0;

  try {
    const parsed = JSON.parse(content) as { flagged_claims?: unknown };
    return Array.isArray(parsed.flagged_claims) ? parsed.flagged_claims.length : 0;
  } catch {
    return 0;
  }
}

function extractMessageContent(rawResponse: unknown): string | null {
  if (typeof rawResponse !== "object" || rawResponse === null) return null;
  const choices = (rawResponse as { choices?: Array<{ message?: { content?: string } }> }).choices;
  return choices?.[0]?.message?.content ?? null;
}
