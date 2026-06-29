import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AiEvaluationMetrics,
  EvalRunResult,
  EvalTestCase,
} from "@/lib/types";

const DEEPSEEK_PRICING_PER_MILLION = {
  "deepseek-v4-flash": { input: 0.14, output: 0.28 },
  "deepseek-v4-pro": { input: 0.55, output: 2.19 },
};

export async function listEvalTestCases(
  supabase: SupabaseClient
): Promise<EvalTestCase[]> {
  const { data, error } = await supabase
    .from("eval_test_cases")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as EvalTestCase[];
}

export async function insertEvalRunResult(
  supabase: SupabaseClient,
  input: Omit<EvalRunResult, "id">
): Promise<EvalRunResult> {
  const { data, error } = await supabase
    .from("eval_run_results")
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as EvalRunResult;
}

export async function getAiEvaluationMetrics(
  supabase: SupabaseClient
): Promise<AiEvaluationMetrics> {
  const [{ data: evalRows, error: evalError }, { data: logs, error: logsError }] =
    await Promise.all([
      supabase
        .from("eval_run_results")
        .select("*")
        .order("run_timestamp", { ascending: false }),
      supabase
        .from("ai_call_logs")
        .select(
          "feature_name, model_name, input_tokens, output_tokens, latency_ms, confidence_score, validation_passed, raw_response_json"
        ),
    ]);

  if (evalError) throw new Error(evalError.message);
  if (logsError) throw new Error(logsError.message);

  const results = (evalRows ?? []) as EvalRunResult[];
  const latestRunTimestamp = results[0]?.run_timestamp ?? null;
  const latestResults = latestRunTimestamp
    ? results.filter((result) => result.run_timestamp === latestRunTimestamp)
    : [];
  const passedCount = latestResults.filter((result) => result.passed).length;

  const aiLogs = (logs ?? []) as Array<{
    feature_name: string;
    model_name: string;
    input_tokens: number;
    output_tokens: number;
    latency_ms: number;
    confidence_score: number | null;
    validation_passed: boolean;
    raw_response_json: unknown;
  }>;

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
    average_keyword_precision: average(
      latestResults.map((result) => result.keyword_precision)
    ),
    average_keyword_recall: average(
      latestResults.map((result) => result.keyword_recall)
    ),
    tailoring_hallucinations_detected: hallucinationLogs.reduce(
      (sum, log) => sum + countFlaggedClaims(log.raw_response_json),
      0
    ),
    average_generation_time_ms: average(aiLogs.map((log) => log.latency_ms)),
    average_cost_per_request: average(aiLogs.map(estimateLogCost)),
    average_confidence_score:
      confidenceValues.length > 0 ? average(confidenceValues) : null,
    total_eval_runs: new Set(results.map((result) => result.run_timestamp)).size,
  };
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
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
  const choices = (rawResponse as { choices?: Array<{ message?: { content?: string } }> })
    .choices;
  return choices?.[0]?.message?.content ?? null;
}
