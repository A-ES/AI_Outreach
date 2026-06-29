import type { SupabaseClient } from "@supabase/supabase-js";
import type { DashboardStats } from "@/lib/types";
import { getDashboardStats } from "@/lib/db/applications";
import { getWeeklyGoal } from "@/lib/db/weekly-goals";

export async function getDashboard(
  supabase: SupabaseClient,
  userId: string,
  weekStartDate: string
): Promise<DashboardStats> {
  const [stats, weeklyGoal] = await Promise.all([
    getDashboardStats(supabase, userId, weekStartDate),
    getWeeklyGoal(supabase, userId, weekStartDate),
  ]);

  return {
    totalApplications: stats.totalApplications,
    totalInterviews: stats.totalInterviews,
    totalOffers: stats.totalOffers,
    weeklyGoal,
  };
}
