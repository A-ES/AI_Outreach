import { NextRequest } from "next/server";
import {
  jsonData,
  jsonError,
  requireUser,
} from "@/lib/api/helpers";
import { listContacts, createContact } from "@/lib/db/contacts";
import { contactCreateSchema } from "@/lib/validation/schemas";

export async function GET() {
  const { user, supabase, error } = await requireUser();
  if (error) return error;

  try {
    const contacts = await listContacts(supabase, user!.id);
    return jsonData({ contacts });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Failed to fetch contacts", 500);
  }
}

export async function POST(request: NextRequest) {
  const { user, supabase, error } = await requireUser();
  if (error) return error;

  try {
    const body = await request.json();
    const parsed = contactCreateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const contact = await createContact(supabase, user!.id, parsed.data);
    return jsonData({ contact }, 201);
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Failed to create contact", 500);
  }
}
