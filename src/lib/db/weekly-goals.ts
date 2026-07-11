import type Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import type { WeeklyGoal } from "@/lib/types";
import type { WeeklyGoalInput } from "@/lib/validation/schemas";

export function getWeeklyGoal(
  db: Database.Database,
  userId: string,
  weekStartDate: string
): WeeklyGoal | null {
  return (
    (db
      .prepare(
        "SELECT * FROM weekly_goals WHERE user_id = ? AND week_start_date = ?"
      )
      .get(userId, weekStartDate) as WeeklyGoal | undefined) ?? null
  );
}

export function upsertWeeklyGoal(
  db: Database.Database,
  userId: string,
  input: WeeklyGoalInput
): WeeklyGoal {
  const existing = getWeeklyGoal(db, userId, input.week_start_date);

  if (existing) {
    db.prepare(
      `UPDATE weekly_goals SET target_applications = ?, target_interviews = ? WHERE id = ?`
    ).run(input.target_applications, input.target_interviews, existing.id);
  } else {
    const id = uuidv4();
    db.prepare(
      `INSERT INTO weekly_goals (id, user_id, week_start_date, target_applications, target_interviews, actual_applications, actual_interviews)
       VALUES (?, ?, ?, ?, ?, 0, 0)`
    ).run(id, userId, input.week_start_date, input.target_applications, input.target_interviews);
  }

  recalculateWeeklyGoals(db, userId);
  return getWeeklyGoal(db, userId, input.week_start_date)!;
}

export function recalculateWeeklyGoals(
  db: Database.Database,
  userId: string
): void {
  const goals = db
    .prepare("SELECT * FROM weekly_goals WHERE user_id = ?")
    .all(userId) as WeeklyGoal[];

  for (const goal of goals) {
    const weekEnd = new Date(goal.week_start_date);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndStr = weekEnd.toISOString().slice(0, 10);

    const actualApps = db
      .prepare(
        `SELECT COUNT(*) as count FROM applications
         WHERE user_id = ? AND date_applied IS NOT NULL
         AND date_applied >= ? AND date_applied < ?
         AND status IN ('applied','interviewing','offer','rejected','ghosted')`
      )
      .get(userId, goal.week_start_date, weekEndStr) as { count: number };

    const actualInterviews = db
      .prepare(
        `SELECT COUNT(*) as count FROM applications
         WHERE user_id = ? AND date_status_changed IS NOT NULL
         AND date_status_changed >= ? AND date_status_changed < ?
         AND status IN ('interviewing','offer')`
      )
      .get(userId, goal.week_start_date, weekEndStr) as { count: number };

    db.prepare(
      `UPDATE weekly_goals SET actual_applications = ?, actual_interviews = ? WHERE id = ?`
    ).run(actualApps.count, actualInterviews.count, goal.id);
  }
}
