import { NextRequest } from "next/server";
import { jsonData, jsonError, requireUser } from "@/lib/api/helpers";
import {
  getApplication,
  updateApplication,
  deleteApplication,
} from "@/lib/db/applications";
import { applicationUpdateSchema } from "@/lib/validation/schemas";

type RouteContext = { params: { id: string } };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { user, db } = requireUser();
  const { id } = context.params;

  try {
    const application = getApplication(db, user.id, id);
    if (!application) return jsonError("Application not found", 404);
    return jsonData({ application });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Failed to fetch application", 500);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { user, db } = requireUser();
  const { id } = context.params;

  try {
    const body = await request.json();
    const parsed = applicationUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const application = updateApplication(db, user.id, id, parsed.data);
    return jsonData({ application });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update application";
    const status = message === "Application not found" ? 404 : 500;
    return jsonError(message, status);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { user, db } = requireUser();
  const { id } = context.params;

  try {
    const existing = getApplication(db, user.id, id);
    if (!existing) return jsonError("Application not found", 404);
    deleteApplication(db, user.id, id);
    return jsonData({ success: true });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Failed to delete application", 500);
  }
}
