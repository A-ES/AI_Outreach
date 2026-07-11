import { NextRequest } from "next/server";
import { jsonData, jsonError, requireUser } from "@/lib/api/helpers";
import { updateOutreachOutcome } from "@/lib/db/outreach-emails";
import { outreachOutcomeSchema } from "@/lib/validation/outreach";

type RouteContext = { params: { id: string } };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { user, db } = requireUser();

  try {
    const body = await request.json();
    const parsed = outreachOutcomeSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const email = updateOutreachOutcome(db, user.id, context.params.id, parsed.data);
    return jsonData({ email });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update outcome";
    return jsonError(message, 400);
  }
}
