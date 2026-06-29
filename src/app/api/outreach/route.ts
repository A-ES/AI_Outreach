import { NextRequest } from "next/server";
import { jsonData, jsonError, requireUser } from "@/lib/api/helpers";
import {
  createOutreachEmail,
  listOutreachEmails,
} from "@/lib/db/outreach-emails";
import { createOutreachDraftService } from "@/lib/services/outreach-draft-service";
import { getContact } from "@/lib/db/contacts";
import { outreachGenerateRequestSchema, type OutreachEmailStatus } from "@/lib/validation/outreach";

export async function GET(request: NextRequest) {
  const { user, supabase, error } = await requireUser();
  if (error) return error;

  const status = request.nextUrl.searchParams.get("status") ?? undefined;

  try {
    const emails = await listOutreachEmails(
      supabase,
      user!.id,
      status as OutreachEmailStatus | undefined
    );
    return jsonData({ emails });
  } catch (e) {
    return jsonError(
      e instanceof Error ? e.message : "Failed to list outreach emails",
      500
    );
  }
}

export async function POST(request: NextRequest) {
  const { user, supabase, error } = await requireUser();
  if (error) return error;

  try {
    const body = await request.json();
    const parsed = outreachGenerateRequestSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const contact = await getContact(supabase, user!.id, parsed.data.contactId);
    if (!contact) return jsonError("Contact not found", 404);

    const service = createOutreachDraftService({
      supabase,
      userId: user!.id,
      regenerationNote: parsed.data.regenerationNote,
    });

    const result = await service.generate(parsed.data.contactId);

    if (result.status === "needs_review") {
      return jsonData(
        {
          status: "needs_review",
          validationErrors: result.validationErrors,
          logId: result.logId,
        },
        422
      );
    }

    const email = await createOutreachEmail(supabase, user!.id, {
      contact_id: parsed.data.contactId,
      application_id: contact.application_id,
      subject: result.subject,
      body: result.body,
    });

    return jsonData({ status: "success", email, logId: result.logId }, 201);
  } catch (e) {
    return jsonError(
      e instanceof Error ? e.message : "Failed to generate draft",
      500
    );
  }
}
