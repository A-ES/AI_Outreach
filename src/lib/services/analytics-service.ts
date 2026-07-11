import type Database from "better-sqlite3";
import { getOutcomeAnalyticsStats } from "@/lib/db/analytics";
import { createLLMClient } from "@/lib/llm/client";
import type { LLMClient } from "@/lib/llm/client";
import { loadPromptTemplate } from "@/lib/llm/prompt-loader";
import { DEEPSEEK_MODELS } from "@/lib/llm/types";
import type {
  AnalyticsResult,
  InsufficientDataResult,
  InsightResult,
} from "@/lib/types";
import { analyticsInsightSchema } from "@/lib/validation/analytics";

export const MIN_LOGGED_OUTCOMES_FOR_ANALYTICS = 15;

const FEATURE_NAME = "analytics_insights";

interface AnalyticsServiceDeps {
  llmClient?: Pick<LLMClient, "generate">;
  statsProvider?: typeof getOutcomeAnalyticsStats;
}

export class AnalyticsService {
  private readonly llmClient?: Pick<LLMClient, "generate">;
  private readonly statsProvider: typeof getOutcomeAnalyticsStats;

  constructor(private readonly db: Database.Database, deps?: Partial<AnalyticsServiceDeps>) {
    this.llmClient = deps?.llmClient;
    this.statsProvider = deps?.statsProvider ?? getOutcomeAnalyticsStats;
  }

  async generateInsights(userId: string): Promise<AnalyticsResult> {
    const stats = this.statsProvider(this.db, userId);

    if (stats.logged_outcome_count < MIN_LOGGED_OUTCOMES_FOR_ANALYTICS) {
      return {
        insufficient_data: true,
        current_count: stats.logged_outcome_count,
        required_count: MIN_LOGGED_OUTCOMES_FOR_ANALYTICS,
      } satisfies InsufficientDataResult;
    }

    const prompt = loadPromptTemplate("analytics_insights.md", {
      aggregate_statistics_json: JSON.stringify(stats, null, 2),
    });

    const llmClient = this.llmClient ?? createLLMClient(this.db);
    const result = await llmClient.generate({
      userId,
      featureName: FEATURE_NAME,
      prompt,
      schema: analyticsInsightSchema,
      model: DEEPSEEK_MODELS.FLASH,
      temperature: 0.2,
    });

    if (result.status !== "success") {
      throw new Error(
        `Analytics insight validation failed: ${result.validationErrors.join("; ")}`
      );
    }

    return result.content satisfies InsightResult;
  }
}

export function createAnalyticsService(
  db: Database.Database,
  deps?: Partial<AnalyticsServiceDeps>
) {
  return new AnalyticsService(db, deps);
}
