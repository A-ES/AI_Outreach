import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Application,
  ApplicationStatus,
  DashboardStats,
} from "@/lib/types";
import type {
  ApplicationCreateInput,
  ApplicationUpdateInput,
} from "@/lib/validation/schemas";
import { todayISO } from "@/lib/utils/dates";

function emptyToNull(value: string | null | undefined): string | null {
  if (value === undefined) return undefined as unknown as null;
  return value === "" ? null : value;
}

function buildStatusFields(
  status: ApplicationStatus,
  previousStatus?: ApplicationStatus,
  dateApplied?: string | null
) {
  const today = todayISO();
  const fields: Record<string, string | null> = {
    status,
    date_status_changed: today,
  };

  if (
    status !== "saved" &&
    (previousStatus === "saved" || previousStatus === undefined) &&
    !dateApplied
  ) {
    fields.date_applied = today;
  }

  return fields;
}

export async function listApplications(
  supabase: SupabaseClient,
  userId: string
): Promise<Application[]> {
  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Application[];
}

export async function getApplication(
  supabase: SupabaseClient,
  userId: string,
  id: string
): Promise<Application | null> {
  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as Application | null;
}

export async function createApplication(
  supabase: SupabaseClient,
  userId: string,
  input: ApplicationCreateInput
): Promise<Application> {
  const status = input.status ?? "saved";
  const payload = {
    user_id: userId,
    company_name: input.company_name,
    role_title: input.role_title,
    job_description_text: emptyToNull(input.job_description_text ?? null),
    status,
    date_applied: emptyToNull(input.date_applied ?? null),
    date_status_changed: status !== "saved" ? todayISO() : null,
    notes: emptyToNull(input.notes ?? null),
  };

  if (status !== "saved" && !payload.date_applied) {
    payload.date_applied = todayISO();
  }

  const { data, error } = await supabase
    .from("applications")
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Application;
}

export async function updateApplication(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  input: ApplicationUpdateInput
): Promise<Application> {
  const existing = await getApplication(supabase, userId, id);
  if (!existing) throw new Error("Application not found");

  const payload: Record<string, unknown> = {};

  if (input.company_name !== undefined) payload.company_name = input.company_name;
  if (input.role_title !== undefined) payload.role_title = input.role_title;
  if (input.job_description_text !== undefined) {
    payload.job_description_text = emptyToNull(input.job_description_text);
  }
  if (input.notes !== undefined) payload.notes = emptyToNull(input.notes);
  if (input.date_applied !== undefined) {
    payload.date_applied = emptyToNull(input.date_applied);
  }

  if (input.status !== undefined && input.status !== existing.status) {
    Object.assign(
      payload,
      buildStatusFields(
        input.status,
        existing.status,
        (input.date_applied ?? existing.date_applied) as string | null
      )
    );
  }

  const { data, error } = await supabase
    .from("applications")
    .update(payload)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Application;
}

export async function updateApplicationStatus(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  status: ApplicationStatus
): Promise<Application> {
  return updateApplication(supabase, userId, id, { status });
}

export async function deleteApplication(
  supabase: SupabaseClient,
  userId: string,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from("applications")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}

export async function getDashboardStats(
  supabase: SupabaseClient,
  userId: string,
  weekStartDate: string
): Promise<Omit<DashboardStats, "weeklyGoal"> & { weekStartDate: string }> {
  const { data: applications, error: appError } = await supabase
    .from("applications")
    .select("status")
    .eq("user_id", userId);

  if (appError) throw new Error(appError.message);

  const rows = applications ?? [];
  const totalApplications = rows.length;
  const totalInterviews = rows.filter((a) =>
    ["interviewing", "offer"].includes(a.status)
  ).length;
  const totalOffers = rows.filter((a) => a.status === "offer").length;

  return {
    totalApplications,
    totalInterviews,
    totalOffers,
    weekStartDate,
  };
}
