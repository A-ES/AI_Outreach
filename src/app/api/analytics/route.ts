import { jsonData, jsonError, requireUser } from "@/lib/api/helpers";
import { getOutcomeAnalyticsStats } from "@/lib/db/analytics";
import {
  createAnalyticsService,
  MIN_LOGGED_OUTCOMES_FOR_ANALYTICS,
} from "@/lib/services/analytics-service";

export async function GET() {
  const { user, supabase, error } = await requireUser();
  if (error) return error;

  try {
    const stats = await getOutcomeAnalyticsStats(supabase, user!.id);
    let insight = null;
    let insightError = null;

    try {
      insight = await createAnalyticsService(supabase).generateInsights(user!.id);
    } catch (e) {
      insightError =
        e instanceof Error ? e.message : "Failed to generate analytics insight";
    }

    return jsonData({
      stats,
      insight,
      insight_error: insightError,
      required_count: MIN_LOGGED_OUTCOMES_FOR_ANALYTICS,
    });
  } catch (e) {
    return jsonError(
      e instanceof Error ? e.message : "Failed to fetch analytics",
      500
    );
  }
}
