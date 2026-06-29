import {
  DEEPSEEK_MODELS,
  type AdapterGenerateParams,
  type AdapterGenerateResult,
  type LLMAdapter,
} from "@/lib/llm/types";

interface DeepSeekConfig {
  apiKey: string;
  baseUrl: string;
  defaultModel: string;
}

interface ChatCompletionResponse {
  id: string;
  model: string;
  choices: Array<{
    message: { content: string };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export function createDeepSeekAdapter(config?: Partial<DeepSeekConfig>): LLMAdapter {
  const apiKey = config?.apiKey ?? process.env.DEEPSEEK_API_KEY;
  const baseUrl =
    config?.baseUrl ?? process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";
  const defaultModel =
    config?.defaultModel ??
    process.env.LLM_DEFAULT_MODEL ??
    DEEPSEEK_MODELS.FLASH;

  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY is required when LLM_PROVIDER=deepseek");
  }

  return {
    providerName: "deepseek",

    async generate(params: AdapterGenerateParams): Promise<AdapterGenerateResult> {
      const model = params.model ?? defaultModel;
      const temperature = params.temperature ?? 0.2;
      const started = performance.now();

      const body: Record<string, unknown> = {
        model,
        messages: [
          { role: "system", content: params.systemPrompt },
          { role: "user", content: params.prompt },
        ],
        temperature,
        response_format: { type: "json_object" },
      };

      if (params.thinkingMode && model === DEEPSEEK_MODELS.PRO) {
        body.thinking = { type: "enabled" };
      }

      const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      const latencyMs = Math.round(performance.now() - started);
      const rawResponse = await response.json();

      if (!response.ok) {
        const message =
          typeof rawResponse === "object" &&
          rawResponse !== null &&
          "error" in rawResponse
            ? String((rawResponse as { error?: { message?: string } }).error?.message)
            : `DeepSeek API error (${response.status})`;
        throw new Error(message);
      }

      const parsed = rawResponse as ChatCompletionResponse;
      const content = parsed.choices?.[0]?.message?.content ?? "";

      return {
        content,
        inputTokens: parsed.usage?.prompt_tokens ?? 0,
        outputTokens: parsed.usage?.completion_tokens ?? 0,
        latencyMs,
        modelName: parsed.model ?? model,
        rawResponse,
      };
    },
  };
}
