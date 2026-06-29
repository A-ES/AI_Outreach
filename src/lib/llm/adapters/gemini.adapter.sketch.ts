/**
 * SKETCH: GeminiAdapter — not wired into the factory yet.
 *
 * To add Gemini as a provider:
 * 1. Set LLM_PROVIDER=gemini in environment variables
 * 2. Implement this adapter (install @google/generative-ai or use REST)
 * 3. Add one case to createLLMAdapter() in adapters/index.ts
 *
 * No other files need to change — all features call LLMClient.generate().
 */

import type {
  AdapterGenerateParams,
  AdapterGenerateResult,
  LLMAdapter,
} from "@/lib/llm/types";

export function createGeminiAdapterSketch(): LLMAdapter {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is required when LLM_PROVIDER=gemini");
  }

  return {
    providerName: "gemini",

    async generate(params: AdapterGenerateParams): Promise<AdapterGenerateResult> {
      const model = params.model ?? process.env.LLM_DEFAULT_MODEL ?? "gemini-2.0-flash";
      const started = performance.now();

      // Example REST shape — replace with official SDK when implementing:
      // POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
      // Pass params.systemPrompt + params.prompt as contents
      // Request responseMimeType: "application/json" for structured output

      void params;
      void model;
      void apiKey;

      throw new Error(
        "GeminiAdapter is a sketch only. Implement createGeminiAdapter() and register it in adapters/index.ts."
      );

      return {
        content: "{}",
        inputTokens: 0,
        outputTokens: 0,
        latencyMs: Math.round(performance.now() - started),
        modelName: model,
        rawResponse: {},
      };
    },
  };
}
