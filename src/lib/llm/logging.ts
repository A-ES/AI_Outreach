import type Database from "better-sqlite3";
import type { AiCallLogInsert } from "@/lib/llm/types";
import { insertAiCallLog } from "@/lib/db/ai-call-logs";

export interface GenerationLogPayload {
  userId: string;
  featureName: string;
  promptText: string;
  modelName: string;
  temperature: number | null;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  validationPassed: boolean;
  validationRetryCount: number;
  rawResponses: unknown[];
}

/** Persists one row per LLMClient.generate() invocation with full metadata. */
export function logLLMGeneration(
  db: Database.Database,
  payload: GenerationLogPayload
) {
  const logEntry: AiCallLogInsert = {
    user_id: payload.userId,
    feature_name: payload.featureName,
    prompt_text: payload.promptText,
    model_name: payload.modelName,
    temperature: payload.temperature,
    input_tokens: payload.inputTokens,
    output_tokens: payload.outputTokens,
    latency_ms: payload.latencyMs,
    confidence_score: null,
    validation_passed: payload.validationPassed,
    validation_retry_count: payload.validationRetryCount,
    raw_response_json:
      payload.rawResponses.length === 1
        ? payload.rawResponses[0]
        : { attempts: payload.rawResponses },
  };

  return insertAiCallLog(db, logEntry);
}
