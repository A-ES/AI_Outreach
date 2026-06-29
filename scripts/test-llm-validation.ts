/**
 * Manual test for LLM validation retry + needs_review behavior.
 * Run: npm run test:llm
 *
 * Uses mock adapter — no API key or Supabase required.
 */

import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { LLMClient } from "../src/lib/llm/client";
import type {
  AdapterGenerateParams,
  AdapterGenerateResult,
  LLMAdapter,
} from "../src/lib/llm/types";

const testSchema = z.object({
  score: z.number().int().min(0).max(100),
  label: z.string().min(1),
});

function createMockAdapter(responses: string[]): LLMAdapter & { callCount: number } {
  let callIndex = 0;
  const adapter: LLMAdapter & { callCount: number } = {
    providerName: "deepseek",
    callCount: 0,
    async generate(_params: AdapterGenerateParams): Promise<AdapterGenerateResult> {
      adapter.callCount += 1;
      const content = responses[Math.min(callIndex, responses.length - 1)] ?? responses.at(-1)!;
      callIndex += 1;
      return {
        content,
        inputTokens: 12,
        outputTokens: 8,
        latencyMs: 42,
        modelName: "mock-model",
        rawResponse: { mock: true, attempt: callIndex },
      };
    },
  };
  return adapter;
}

function createMockSupabase(): SupabaseClient {
  return {
    from: () => ({
      insert: () => ({
        select: () => ({
          single: async () => ({
            data: {
              id: crypto.randomUUID(),
              user_id: "test-user",
              feature_name: "test",
              prompt_text: "test",
              model_name: "mock-model",
              temperature: 0.2,
              input_tokens: 12,
              output_tokens: 8,
              latency_ms: 42,
              confidence_score: null,
              validation_passed: false,
              validation_retry_count: 0,
              raw_response_json: {},
              created_at: new Date().toISOString(),
            },
            error: null,
          }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;
}

async function runTests() {
  let passed = 0;
  let failed = 0;

  async function assert(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`✓ ${name}`);
      passed += 1;
    } catch (e) {
      console.error(`✗ ${name}`);
      console.error(`  ${e instanceof Error ? e.message : e}`);
      failed += 1;
    }
  }

  await assert("invalid then valid → success after exactly one retry", async () => {
    const adapter = createMockAdapter([
      '{"score": "not-a-number", "label": "bad"}',
      '{"score": 88, "label": "good"}',
    ]);
    const client = new LLMClient({ adapter, supabase: createMockSupabase() });

    const result = await client.generate({
      prompt: "Return a score and label.",
      schema: testSchema,
      featureName: "validation_test",
      userId: "user-1",
    });

    if (result.status !== "success") {
      throw new Error(`Expected success, got ${result.status}`);
    }
    if (result.content.score !== 88) {
      throw new Error(`Expected score 88, got ${result.content.score}`);
    }
    if (result.validationRetryCount !== 1) {
      throw new Error(`Expected 1 retry, got ${result.validationRetryCount}`);
    }
    if (adapter.callCount !== 2) {
      throw new Error(`Expected 2 adapter calls, got ${adapter.callCount}`);
    }
  });

  await assert("always invalid → needs_review after exactly one retry", async () => {
    const adapter = createMockAdapter([
      '{"score": "nope"}',
      '{"wrong_key": true}',
    ]);
    const client = new LLMClient({ adapter, supabase: createMockSupabase() });

    const result = await client.generate({
      prompt: "Return a score and label.",
      schema: testSchema,
      featureName: "validation_test",
      userId: "user-1",
    });

    if (result.status !== "needs_review") {
      throw new Error(`Expected needs_review, got ${result.status}`);
    }
    if (result.validationRetryCount !== 1) {
      throw new Error(`Expected 1 retry, got ${result.validationRetryCount}`);
    }
    if (adapter.callCount !== 2) {
      throw new Error(`Expected exactly 2 adapter calls, got ${adapter.callCount}`);
    }
    if (result.validationErrors.length === 0) {
      throw new Error("Expected validation errors to be populated");
    }
  });

  await assert("valid on first try → no retry", async () => {
    const adapter = createMockAdapter(['{"score": 50, "label": "ok"}']);
    const client = new LLMClient({ adapter, supabase: createMockSupabase() });

    const result = await client.generate({
      prompt: "Return a score and label.",
      schema: testSchema,
      featureName: "validation_test",
      userId: "user-1",
    });

    if (result.status !== "success") {
      throw new Error(`Expected success, got ${result.status}`);
    }
    if (result.validationRetryCount !== 0) {
      throw new Error(`Expected 0 retries, got ${result.validationRetryCount}`);
    }
    if (adapter.callCount !== 1) {
      throw new Error(`Expected 1 adapter call, got ${adapter.callCount}`);
    }
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

runTests();
