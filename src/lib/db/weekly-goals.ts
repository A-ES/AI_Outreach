import type { SupabaseClient } from "@supabase/supabase-js";
import type { WeeklyGoal } from "@/lib/types";
import type { WeeklyGoalInput } from "@/lib/validation/schemas";

export async function getWeeklyGoal(
  supabase: SupabaseClient,
  userId: string,
  weekStartDate: string
): Promise<WeeklyGoal | null> {
  const { data, error } = await supabase
    .from("weekly_goals")
    .select("*")
    .eq("user_id", userId)
    .eq("week_start_date", weekStartDate)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as WeeklyGoal | null;
}

export async function upsertWeeklyGoal(
  supabase: SupabaseClient,
  userId: string,
  input: WeeklyGoalInput
): Promise<WeeklyGoal> {
  const { data, error } = await supabase
    .from("weekly_goals")
    .upsert(
      {
        user_id: userId,
        week_start_date: input.week_start_date,
        target_applications: input.target_applications,
        target_interviews: input.target_interviews,
      },
      { onConflict: "user_id,week_start_date" }
    )
    .select()
    .single();

  if (error) throw new Error(error.message);

  await supabase.rpc("recalculate_weekly_goals", { p_user_id: userId });

  const refreshed = await getWeeklyGoal(
    supabase,
    userId,
    input.week_start_date
  );
  return refreshed ?? (data as WeeklyGoal);
}

export async function recalculateWeeklyGoals(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const { error } = await supabase.rpc("recalculate_weekly_goals", {
    p_user_id: userId,
  });
  if (error) throw new Error(error.message);
}
