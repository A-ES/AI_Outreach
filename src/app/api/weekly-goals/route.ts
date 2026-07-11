import { NextRequest } from "next/server";
import { jsonData, jsonError, requireUser } from "@/lib/api/helpers";
import { getWeeklyGoal, upsertWeeklyGoal } from "@/lib/db/weekly-goals";
import { weeklyGoalSchema } from "@/lib/validation/schemas";
import { getWeekStartDate } from "@/lib/utils/dates";

export async function GET(request: NextRequest) {
  const { user, db } = requireUser();

  const weekStart =
    request.nextUrl.searchParams.get("week_start_date") ?? getWeekStartDate();

  try {
    const goal = getWeeklyGoal(db, user.id, weekStart);
    return jsonData({ goal, weekStartDate: weekStart });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Failed to fetch weekly goal", 500);
  }
}

export async function PUT(request: NextRequest) {
  const { user, db } = requireUser();

  try {
    const body = await request.json();
    const parsed = weeklyGoalSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const goal = upsertWeeklyGoal(db, user.id, parsed.data);
    return jsonData({ goal });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Failed to save weekly goal", 500);
  }
}
