import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiCallLog, AiCallLogInsert } from "@/lib/llm/types";

export async function insertAiCallLog(
  supabase: SupabaseClient,
  log: AiCallLogInsert
): Promise<AiCallLog> {
  const { data, error } = await supabase
    .from("ai_call_logs")
    .insert(log)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as AiCallLog;
}

export async function listAiCallLogs(
  supabase: SupabaseClient,
  userId: string,
  limit = 50
): Promise<AiCallLog[]> {
  const { data, error } = await supabase
    .from("ai_call_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as AiCallLog[];
}
