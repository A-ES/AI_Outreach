import { NextRequest } from "next/server";
import {
  jsonData,
  jsonError,
  requireUser,
} from "@/lib/api/helpers";
import {
  getContact,
  updateContact,
  deleteContact,
} from "@/lib/db/contacts";
import { contactUpdateSchema } from "@/lib/validation/schemas";

type RouteContext = { params: { id: string } };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { user, supabase, error } = await requireUser();
  if (error) return error;

  const { id } = context.params;

  try {
    const contact = await getContact(supabase, user!.id, id);
    if (!contact) return jsonError("Contact not found", 404);
    return jsonData({ contact });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Failed to fetch contact", 500);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { user, supabase, error } = await requireUser();
  if (error) return error;

  const { id } = context.params;

  try {
    const body = await request.json();
    const parsed = contactUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const contact = await updateContact(supabase, user!.id, id, parsed.data);
    return jsonData({ contact });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Failed to update contact", 500);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { user, supabase, error } = await requireUser();
  if (error) return error;

  const { id } = context.params;

  try {
    const existing = await getContact(supabase, user!.id, id);
    if (!existing) return jsonError("Contact not found", 404);

    await deleteContact(supabase, user!.id, id);
    return jsonData({ success: true });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Failed to delete contact", 500);
  }
}
