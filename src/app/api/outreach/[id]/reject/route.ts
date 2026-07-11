import { NextRequest } from "next/server";
import { jsonData, jsonError, requireUser } from "@/lib/api/helpers";
import { rejectOutreachEmail } from "@/lib/db/outreach-emails";

type RouteContext = { params: { id: string } };

export async function POST(_request: NextRequest, context: RouteContext) {
  const { user, db } = requireUser();

  try {
    const email = rejectOutreachEmail(db, user.id, context.params.id);
    return jsonData({ email });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to reject";
    return jsonError(message, message.includes("transition") ? 400 : 500);
  }
}
