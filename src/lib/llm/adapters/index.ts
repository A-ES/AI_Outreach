import type { LLMAdapter, LLMProvider } from "@/lib/llm/types";
import { createDeepSeekAdapter } from "@/lib/llm/adapters/deepseek";

export function getConfiguredProvider(): LLMProvider {
  const provider = (process.env.LLM_PROVIDER ?? "deepseek").toLowerCase();
  if (provider === "deepseek" || provider === "gemini" || provider === "openai") {
    return provider;
  }
  throw new Error(`Unknown LLM_PROVIDER: ${provider}`);
}

/**
 * Factory for the active LLM adapter. Swap providers via LLM_PROVIDER env var.
 * Adding a new provider = one new adapter file + one case here.
 */
export function createLLMAdapter(): LLMAdapter {
  const provider = getConfiguredProvider();

  switch (provider) {
    case "deepseek":
      return createDeepSeekAdapter();
    case "gemini":
      // import { createGeminiAdapter } from "./gemini" when implemented
      throw new Error(
        "LLM_PROVIDER=gemini is not implemented yet. See adapters/gemini.adapter.sketch.ts"
      );
    case "openai":
      throw new Error(
        "LLM_PROVIDER=openai is not implemented yet. Add adapters/openai.ts following deepseek.ts"
      );
    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }
}
