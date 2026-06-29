import type { SupabaseClient } from "@supabase/supabase-js";
import type { ResumeMatchResult } from "@/lib/types";
import type { ResumeMatchLLMOutput } from "@/lib/validation/resume-match";

export interface InsertResumeMatchResultInput {
  user_id: string;
  application_id: string | null;
  resume_id: string | null;
  output: ResumeMatchLLMOutput;
}

export async function insertResumeMatchResult(
  supabase: SupabaseClient,
  input: InsertResumeMatchResultInput
): Promise<ResumeMatchResult> {
  const { output } = input;

  const { data, error } = await supabase
    .from("resume_match_results")
    .insert({
      user_id: input.user_id,
      application_id: input.application_id,
      resume_id: input.resume_id,
      match_score: output.match_score,
      matched_keywords: output.matched_keywords,
      missing_keywords: output.missing_keywords,
      reasoning_trace: output.reasoning_trace,
      confidence_label: output.confidence_label,
      confidence_reason: output.confidence_reason,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as ResumeMatchResult;
}

export async function listResumeMatchResultsByApplication(
  supabase: SupabaseClient,
  userId: string,
  applicationId: string
): Promise<ResumeMatchResult[]> {
  const { data, error } = await supabase
    .from("resume_match_results")
    .select("*")
    .eq("user_id", userId)
    .eq("application_id", applicationId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as ResumeMatchResult[];
}

export async function getResumeMatchResult(
  supabase: SupabaseClient,
  userId: string,
  id: string
): Promise<ResumeMatchResult | null> {
  const { data, error } = await supabase
    .from("resume_match_results")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as ResumeMatchResult | null;
}
