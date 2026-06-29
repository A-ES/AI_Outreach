import type { SupabaseClient } from "@supabase/supabase-js";
import type { OutreachEmail, OutreachEmailWithContact } from "@/lib/types";
import type { OutreachEmailStatus, OutreachOutcome } from "@/lib/validation/outreach";
import {
  assertCanEdit,
  assertCanSend,
  canTransition,
} from "@/lib/validation/outreach";

export async function listOutreachEmails(
  supabase: SupabaseClient,
  userId: string,
  status?: OutreachEmailStatus
): Promise<OutreachEmailWithContact[]> {
  let query = supabase
    .from("outreach_emails")
    .select("*, contacts(name, email, company_name, role_title)")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as OutreachEmailWithContact[];
}

export async function getOutreachEmail(
  supabase: SupabaseClient,
  userId: string,
  id: string
): Promise<OutreachEmailWithContact | null> {
  const { data, error } = await supabase
    .from("outreach_emails")
    .select("*, contacts(name, email, company_name, role_title)")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as OutreachEmailWithContact | null;
}

export async function createOutreachEmail(
  supabase: SupabaseClient,
  userId: string,
  input: {
    contact_id: string;
    application_id: string | null;
    subject: string;
    body: string;
  }
): Promise<OutreachEmail> {
  const { data, error } = await supabase
    .from("outreach_emails")
    .insert({
      user_id: userId,
      contact_id: input.contact_id,
      application_id: input.application_id,
      subject: input.subject,
      body: input.body,
      status: "draft",
      date_drafted: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as OutreachEmail;
}

export async function updateOutreachDraftContent(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  input: { subject?: string; body?: string }
): Promise<OutreachEmail> {
  const existing = await getOutreachEmail(supabase, userId, id);
  if (!existing) throw new Error("Outreach email not found");
  assertCanEdit(existing.status);

  const payload: Record<string, string> = {};
  if (input.subject !== undefined) payload.subject = input.subject;
  if (input.body !== undefined) payload.body = input.body;

  const { data, error } = await supabase
    .from("outreach_emails")
    .update(payload)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as OutreachEmail;
}

async function transitionStatus(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  toStatus: OutreachEmailStatus,
  extra?: Record<string, unknown>
): Promise<OutreachEmail> {
  const existing = await getOutreachEmail(supabase, userId, id);
  if (!existing) throw new Error("Outreach email not found");

  if (!canTransition(existing.status, toStatus)) {
    throw new Error(
      `Invalid status transition: "${existing.status}" → "${toStatus}"`
    );
  }

  const { data, error } = await supabase
    .from("outreach_emails")
    .update({ status: toStatus, ...extra })
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as OutreachEmail;
}

export async function approveOutreachEmail(
  supabase: SupabaseClient,
  userId: string,
  id: string
): Promise<OutreachEmail> {
  return transitionStatus(supabase, userId, id, "approved");
}

export async function rejectOutreachEmail(
  supabase: SupabaseClient,
  userId: string,
  id: string
): Promise<OutreachEmail> {
  return transitionStatus(supabase, userId, id, "rejected");
}

export async function markOutreachSent(
  supabase: SupabaseClient,
  userId: string,
  id: string
): Promise<OutreachEmail> {
  const existing = await getOutreachEmail(supabase, userId, id);
  if (!existing) throw new Error("Outreach email not found");
  assertCanSend(existing.status);

  return transitionStatus(supabase, userId, id, "sent", {
    date_sent: new Date().toISOString(),
  });
}

export async function updateOutreachFromRegeneration(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  input: { subject: string; body: string }
): Promise<OutreachEmail> {
  const existing = await getOutreachEmail(supabase, userId, id);
  if (!existing) throw new Error("Outreach email not found");

  const { data, error } = await supabase
    .from("outreach_emails")
    .update({
      subject: input.subject,
      body: input.body,
      status: "draft",
      date_drafted: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as OutreachEmail;
}

export async function updateOutreachOutcome(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  input: { reply_received?: boolean; outcome?: OutreachOutcome | null }
): Promise<OutreachEmail> {
  const existing = await getOutreachEmail(supabase, userId, id);
  if (!existing) throw new Error("Outreach email not found");
  if (existing.status !== "sent") {
    throw new Error("Outcomes can only be logged for sent emails");
  }

  const payload: Record<string, unknown> = {};
  if (input.reply_received !== undefined) {
    payload.reply_received = input.reply_received;
  }
  if (input.outcome !== undefined) payload.outcome = input.outcome;

  const { data, error } = await supabase
    .from("outreach_emails")
    .update(payload)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as OutreachEmail;
}
