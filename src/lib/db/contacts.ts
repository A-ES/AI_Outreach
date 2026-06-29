import type { SupabaseClient } from "@supabase/supabase-js";
import type { Contact, ContactWithApplication } from "@/lib/types";
import type {
  ContactCreateInput,
  ContactUpdateInput,
} from "@/lib/validation/schemas";

function emptyToNull(value: string | null | undefined): string | null {
  if (value === undefined) return undefined as unknown as null;
  return value === "" ? null : value;
}

export async function listContacts(
  supabase: SupabaseClient,
  userId: string
): Promise<ContactWithApplication[]> {
  const { data, error } = await supabase
    .from("contacts")
    .select("*, applications(company_name, role_title)")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as ContactWithApplication[];
}

export async function getContact(
  supabase: SupabaseClient,
  userId: string,
  id: string
): Promise<Contact | null> {
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as Contact | null;
}

export async function createContact(
  supabase: SupabaseClient,
  userId: string,
  input: ContactCreateInput
): Promise<Contact> {
  const payload = {
    user_id: userId,
    name: input.name,
    company_name: emptyToNull(input.company_name ?? null),
    role_title: emptyToNull(input.role_title ?? null),
    email: emptyToNull(input.email ?? null),
    linkedin_url: emptyToNull(input.linkedin_url ?? null),
    status: input.status ?? "not_contacted",
    application_id: input.application_id ?? null,
  };

  const { data, error } = await supabase
    .from("contacts")
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Contact;
}

export async function updateContact(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  input: ContactUpdateInput
): Promise<Contact> {
  const payload: Record<string, unknown> = {};

  if (input.name !== undefined) payload.name = input.name;
  if (input.company_name !== undefined) {
    payload.company_name = emptyToNull(input.company_name);
  }
  if (input.role_title !== undefined) {
    payload.role_title = emptyToNull(input.role_title);
  }
  if (input.email !== undefined) payload.email = emptyToNull(input.email);
  if (input.linkedin_url !== undefined) {
    payload.linkedin_url = emptyToNull(input.linkedin_url);
  }
  if (input.status !== undefined) payload.status = input.status;
  if (input.application_id !== undefined) {
    payload.application_id = input.application_id;
  }

  const { data, error } = await supabase
    .from("contacts")
    .update(payload)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Contact;
}

export async function deleteContact(
  supabase: SupabaseClient,
  userId: string,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from("contacts")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}
