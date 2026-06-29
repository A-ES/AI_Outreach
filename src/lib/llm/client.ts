import type { SupabaseClient } from "@supabase/supabase-js";
import { createLLMAdapter } from "@/lib/llm/adapters";
import { logLLMGeneration } from "@/lib/llm/logging";
import type {
  LLMAdapter,
  LLMGenerateParams,
  LLMGenerateResult,
} from "@/lib/llm/types";
import {
  buildCorrectivePrompt,
  buildSchemaSystemPrompt,
  validateLLMOutput,
} from "@/lib/llm/validation";

const MAX_VALIDATION_RETRIES = 1;

interface LLMClientOptions {
  adapter?: LLMAdapter;
  supabase: SupabaseClient;
}

/**
 * Provider-agnostic LLM client. All AI features must call generate() here —
 * never the adapter directly — so validation and logging cannot be skipped.
 */
export class LLMClient {
  private adapter: LLMAdapter;
  private supabase: SupabaseClient;

  constructor(options: LLMClientOptions) {
    this.adapter = options.adapter ?? createLLMAdapter();
    this.supabase = options.supabase;
  }

  async generate<T>(params: LLMGenerateParams<T>): Promise<LLMGenerateResult<T>> {
    const systemPrompt = buildSchemaSystemPrompt(params.schema);
    const temperature = params.temperature ?? 0.2;

    let prompt = params.prompt;
    let validationRetryCount = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalLatencyMs = 0;
    let modelName = params.model ?? process.env.LLM_DEFAULT_MODEL ?? "deepseek-v4-flash";
    const rawResponses: unknown[] = [];
    let lastRawContent = "";
    let lastErrors: string[] = [];

    for (let attempt = 0; attempt <= MAX_VALIDATION_RETRIES; attempt++) {
      const adapterResult = await this.adapter.generate({
        prompt,
        systemPrompt,
        temperature,
        thinkingMode: params.thinkingMode,
        model: params.model,
      });

      rawResponses.push(adapterResult.rawResponse);
      totalInputTokens += adapterResult.inputTokens;
      totalOutputTokens += adapterResult.outputTokens;
      totalLatencyMs += adapterResult.latencyMs;
      modelName = adapterResult.modelName;
      lastRawContent = adapterResult.content;

      const validation = validateLLMOutput(adapterResult.content, params.schema);

      if (validation.ok) {
        const log = await logLLMGeneration(this.supabase, {
          userId: params.userId,
          featureName: params.featureName,
          promptText: params.prompt,
          modelName,
          temperature,
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          latencyMs: totalLatencyMs,
          validationPassed: true,
          validationRetryCount,
          rawResponses,
        });

        return {
          status: "success",
          content: validation.data,
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          latencyMs: totalLatencyMs,
          validationRetryCount,
          logId: log.id,
        };
      }

      lastErrors = validation.errors;

      if (attempt < MAX_VALIDATION_RETRIES) {
        validationRetryCount += 1;
        prompt = buildCorrectivePrompt(params.prompt, validation.errors);
        continue;
      }
    }

    const log = await logLLMGeneration(this.supabase, {
      userId: params.userId,
      featureName: params.featureName,
      promptText: params.prompt,
      modelName,
      temperature,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      latencyMs: totalLatencyMs,
      validationPassed: false,
      validationRetryCount,
      rawResponses,
    });

    return {
      status: "needs_review",
      validationErrors: lastErrors,
      rawContent: lastRawContent,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      latencyMs: totalLatencyMs,
      validationRetryCount,
      logId: log.id,
    };
  }
}

export function createLLMClient(supabase: SupabaseClient, adapter?: LLMAdapter) {
  return new LLMClient({ supabase, adapter });
}
