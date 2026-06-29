export const DEEPSEEK_MODELS = {
  FLASH: "deepseek-v4-flash",
  PRO: "deepseek-v4-pro",
} as const;

export type DeepSeekModel =
  (typeof DEEPSEEK_MODELS)[keyof typeof DEEPSEEK_MODELS];

export type LLMProvider = "deepseek" | "gemini" | "openai";

/** Raw provider response before schema validation. */
export interface AdapterGenerateParams {
  prompt: string;
  systemPrompt: string;
  temperature?: number;
  thinkingMode?: boolean;
  model?: string;
}

export interface AdapterGenerateResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  modelName: string;
  rawResponse: unknown;
}

/** Provider-agnostic adapter — one implementation per LLM vendor. */
export interface LLMAdapter {
  readonly providerName: LLMProvider;
  generate(params: AdapterGenerateParams): Promise<AdapterGenerateResult>;
}

export interface LLMGenerateParams<T> {
  prompt: string;
  schema: import("zod").ZodType<T>;
  featureName: string;
  userId: string;
  temperature?: number;
  thinkingMode?: boolean;
  model?: string;
}

export interface LLMGenerateSuccess<T> {
  status: "success";
  content: T;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  validationRetryCount: number;
  logId: string;
}

export interface LLMGenerateNeedsReview {
  status: "needs_review";
  validationErrors: string[];
  rawContent: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  validationRetryCount: number;
  logId: string;
}

export type LLMGenerateResult<T> =
  | LLMGenerateSuccess<T>
  | LLMGenerateNeedsReview;

export interface AiCallLog {
  id: string;
  user_id: string;
  feature_name: string;
  prompt_text: string;
  model_name: string;
  temperature: number | null;
  input_tokens: number;
  output_tokens: number;
  latency_ms: number;
  confidence_score: number | null;
  validation_passed: boolean;
  validation_retry_count: number;
  raw_response_json: unknown;
  created_at: string;
}

export interface AiCallLogInsert {
  user_id: string;
  feature_name: string;
  prompt_text: string;
  model_name: string;
  temperature: number | null;
  input_tokens: number;
  output_tokens: number;
  latency_ms: number;
  confidence_score: number | null;
  validation_passed: boolean;
  validation_retry_count: number;
  raw_response_json: unknown;
}
