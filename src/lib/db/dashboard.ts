import type Database from "better-sqlite3";
import type { DashboardStats } from "@/lib/types";
import { getDashboardStats, getFollowUpsDueCount } from "@/lib/db/applications";
import { getWeeklyGoal } from "@/lib/db/weekly-goals";

export function getDashboard(
  db: Database.Database,
  userId: string,
  weekStartDate: string
): DashboardStats {
  const stats = getDashboardStats(db, userId, weekStartDate);
  const weeklyGoal = getWeeklyGoal(db, userId, weekStartDate);
  const followUpsDue = getFollowUpsDueCount(db, userId);

  return {
    totalApplications: stats.totalApplications,
    totalInterviews: stats.totalInterviews,
    totalOffers: stats.totalOffers,
    followUpsDue,
    weeklyGoal,
  };
}
