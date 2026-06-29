import type { SupabaseClient } from "@supabase/supabase-js";
import type { Resume } from "@/lib/types";
import type { ResumeContent } from "@/lib/validation/resume";

export async function listResumes(
  supabase: SupabaseClient,
  userId: string
): Promise<Resume[]> {
  const { data, error } = await supabase
    .from("resumes")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Resume[];
}

export async function getResume(
  supabase: SupabaseClient,
  userId: string,
  id: string
): Promise<Resume | null> {
  const { data, error } = await supabase
    .from("resumes")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as Resume | null;
}

export async function getBaseResume(
  supabase: SupabaseClient,
  userId: string
): Promise<Resume | null> {
  const { data, error } = await supabase
    .from("resumes")
    .select("*")
    .eq("user_id", userId)
    .eq("is_base_resume", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as Resume | null;
}

export async function createResume(
  supabase: SupabaseClient,
  userId: string,
  input: {
    version_label: string;
    content_json: ResumeContent;
    is_base_resume?: boolean;
    tailored_for_application_id?: string | null;
  }
): Promise<Resume> {
  if (input.is_base_resume) {
    await supabase
      .from("resumes")
      .update({ is_base_resume: false })
      .eq("user_id", userId)
      .eq("is_base_resume", true);
  }

  const { data, error } = await supabase
    .from("resumes")
    .insert({
      user_id: userId,
      version_label: input.version_label,
      content_json: input.content_json,
      is_base_resume: input.is_base_resume ?? false,
      tailored_for_application_id: input.tailored_for_application_id ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Resume;
}

export async function updateResume(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  input: {
    version_label?: string;
    content_json?: ResumeContent;
  }
): Promise<Resume> {
  const payload: Record<string, unknown> = {};
  if (input.version_label !== undefined) payload.version_label = input.version_label;
  if (input.content_json !== undefined) payload.content_json = input.content_json;

  const { data, error } = await supabase
    .from("resumes")
    .update(payload)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Resume;
}

export async function setBaseResume(
  supabase: SupabaseClient,
  userId: string,
  id: string
): Promise<Resume> {
  const existing = await getResume(supabase, userId, id);
  if (!existing) throw new Error("Resume not found");

  await supabase
    .from("resumes")
    .update({ is_base_resume: false })
    .eq("user_id", userId)
    .eq("is_base_resume", true);

  const { data, error } = await supabase
    .from("resumes")
    .update({ is_base_resume: true, tailored_for_application_id: null })
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Resume;
}

export async function deleteResume(
  supabase: SupabaseClient,
  userId: string,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from("resumes")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}

export function resumeContentToText(content: ResumeContent): string {
  return JSON.stringify(content, null, 2);
}
