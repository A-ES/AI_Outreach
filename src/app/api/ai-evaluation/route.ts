import { jsonData, jsonError, requireUser } from "@/lib/api/helpers";
import { getAiEvaluationMetrics } from "@/lib/db/evaluations";

export async function GET() {
  const { supabase, error } = await requireUser();
  if (error) return error;

  try {
    const metrics = await getAiEvaluationMetrics(supabase);
    return jsonData({ metrics });
  } catch (e) {
    return jsonError(
      e instanceof Error ? e.message : "Failed to fetch AI evaluation metrics",
      500
    );
  }
}
