import { NextRequest } from "next/server";
import { jsonData, jsonError, requireUser } from "@/lib/api/helpers";
import { deleteResume, getResume, updateResume } from "@/lib/db/resumes";
import { updateResumeRequestSchema } from "@/lib/validation/resume";

type RouteContext = { params: { id: string } };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { user, db } = requireUser();

  try {
    const resume = getResume(db, user.id, context.params.id);
    if (!resume) return jsonError("Resume not found", 404);
    return jsonData({ resume });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Failed to fetch resume", 500);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { user, db } = requireUser();

  try {
    const body = await request.json();
    const parsed = updateResumeRequestSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const existing = getResume(db, user.id, context.params.id);
    if (!existing) return jsonError("Resume not found", 404);

    const resume = updateResume(db, user.id, context.params.id, parsed.data);
    return jsonData({ resume });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Failed to update resume", 500);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { user, db } = requireUser();

  try {
    const existing = getResume(db, user.id, context.params.id);
    if (!existing) return jsonError("Resume not found", 404);
    deleteResume(db, user.id, context.params.id);
    return jsonData({ success: true });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Failed to delete resume", 500);
  }
}
