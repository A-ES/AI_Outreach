import { jsonData, jsonError, requireUser } from "@/lib/api/helpers";
import { getOutcomeAnalyticsStats } from "@/lib/db/analytics";
import {
  createAnalyticsService,
  MIN_LOGGED_OUTCOMES_FOR_ANALYTICS,
} from "@/lib/services/analytics-service";

export async function GET() {
  const { user, db } = requireUser();

  try {
    const stats = getOutcomeAnalyticsStats(db, user.id);
    let insight = null;
    let insightError = null;

    try {
      insight = await createAnalyticsService(db).generateInsights(user.id);
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
