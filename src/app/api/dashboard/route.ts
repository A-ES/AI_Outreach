import {
  jsonData,
  jsonError,
  requireUser,
} from "@/lib/api/helpers";
import { getDashboard } from "@/lib/db/dashboard";
import { getWeekStartDate } from "@/lib/utils/dates";

export async function GET() {
  const { user, supabase, error } = await requireUser();
  if (error) return error;

  const weekStartDate = getWeekStartDate();

  try {
    const dashboard = await getDashboard(supabase, user!.id, weekStartDate);
    return jsonData({ ...dashboard, weekStartDate });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Failed to fetch dashboard", 500);
  }
}
