import { jsonData, jsonError, requireUser } from "@/lib/api/helpers";
import { getDashboard } from "@/lib/db/dashboard";
import { getWeekStartDate } from "@/lib/utils/dates";

export async function GET() {
  const { user, db } = requireUser();
  const weekStartDate = getWeekStartDate();

  try {
    const dashboard = getDashboard(db, user.id, weekStartDate);
    return jsonData({ ...dashboard, weekStartDate });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Failed to fetch dashboard", 500);
  }
}
