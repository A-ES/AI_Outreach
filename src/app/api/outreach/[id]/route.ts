import { NextRequest } from "next/server";
import { jsonData, jsonError, requireUser } from "@/lib/api/helpers";
import { getOutreachEmail, updateOutreachDraftContent } from "@/lib/db/outreach-emails";
import { outreachUpdateDraftSchema } from "@/lib/validation/outreach";

type RouteContext = { params: { id: string } };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { user, supabase, error } = await requireUser();
  if (error) return error;

  try {
    const email = await getOutreachEmail(supabase, user!.id, context.params.id);
    if (!email) return jsonError("Outreach email not found", 404);
    return jsonData({ email });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Failed to fetch email", 500);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { user, supabase, error } = await requireUser();
  if (error) return error;

  try {
    const body = await request.json();
    const parsed = outreachUpdateDraftSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const email = await updateOutreachDraftContent(
      supabase,
      user!.id,
      context.params.id,
      parsed.data
    );
    return jsonData({ email });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update draft";
    const status = message.includes("not found") ? 404 : 400;
    return jsonError(message, status);
  }
}
