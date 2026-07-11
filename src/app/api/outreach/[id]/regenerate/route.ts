import { NextRequest } from "next/server";
import { jsonData, jsonError, requireUser } from "@/lib/api/helpers";
import {
  getOutreachEmail,
  updateOutreachFromRegeneration,
} from "@/lib/db/outreach-emails";
import { createOutreachDraftService } from "@/lib/services/outreach-draft-service";
import {
  assertCanRegenerate,
  outreachRegenerateRequestSchema,
} from "@/lib/validation/outreach";

type RouteContext = { params: { id: string } };

export async function POST(request: NextRequest, context: RouteContext) {
  const { user, db } = requireUser();

  try {
    const body = await request.json();
    const parsed = outreachRegenerateRequestSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const existing = getOutreachEmail(db, user.id, context.params.id);
    if (!existing) return jsonError("Outreach email not found", 404);
    assertCanRegenerate(existing.status);

    const service = createOutreachDraftService({
      db,
      userId: user.id,
      regenerationNote: parsed.data.note,
    });

    const result = await service.generate(existing.contact_id);

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

    const email = updateOutreachFromRegeneration(db, user.id, context.params.id, {
      subject: result.subject,
      body: result.body,
    });

    return jsonData({ status: "success", email, logId: result.logId });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to regenerate";
    return jsonError(message, 400);
  }
}
