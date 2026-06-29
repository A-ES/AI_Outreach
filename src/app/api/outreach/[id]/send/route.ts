import { NextRequest } from "next/server";
import { jsonData, jsonError, requireUser } from "@/lib/api/helpers";
import { getOutreachEmail, markOutreachSent } from "@/lib/db/outreach-emails";
import { sendViaResend } from "@/lib/email/resend";
import { assertCanSend } from "@/lib/validation/outreach";

type RouteContext = { params: { id: string } };

export async function POST(_request: NextRequest, context: RouteContext) {
  const { user, supabase, error } = await requireUser();
  if (error) return error;

  try {
    const email = await getOutreachEmail(
      supabase,
      user!.id,
      context.params.id
    );
    if (!email) return jsonError("Outreach email not found", 404);

    // Server-side enforcement — send unavailable unless approved
    assertCanSend(email.status);

    const to = email.contacts?.email;
    if (!to) {
      return jsonError("Contact has no email address", 400);
    }

    await sendViaResend({
      to,
      subject: email.subject,
      body: email.body,
    });

    const updated = await markOutreachSent(
      supabase,
      user!.id,
      context.params.id
    );

    return jsonData({ email: updated });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to send email";
    const status =
      message.includes("not allowed") || message.includes("approved")
        ? 403
        : message.includes("not configured")
          ? 503
          : 500;
    return jsonError(message, status);
  }
}
