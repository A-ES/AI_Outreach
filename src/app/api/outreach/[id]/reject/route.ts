import { NextRequest } from "next/server";
import { jsonData, jsonError, requireUser } from "@/lib/api/helpers";
import { rejectOutreachEmail } from "@/lib/db/outreach-emails";

type RouteContext = { params: { id: string } };

export async function POST(_request: NextRequest, context: RouteContext) {
  const { user, supabase, error } = await requireUser();
  if (error) return error;

  try {
    const email = await rejectOutreachEmail(
      supabase,
      user!.id,
      context.params.id
    );
    return jsonData({ email });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to reject";
    return jsonError(message, message.includes("transition") ? 400 : 500);
  }
}
