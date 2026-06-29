import { NextRequest } from "next/server";
import { jsonData, jsonError, requireUser } from "@/lib/api/helpers";
import { createResume, getResume } from "@/lib/db/resumes";
import { resumeTailorApproveRequestSchema } from "@/lib/validation/resume";

/** Explicit user approval — only path that saves a tailored version to the DB. */
export async function POST(request: NextRequest) {
  const { user, supabase, error } = await requireUser();
  if (error) return error;

  try {
    const body = await request.json();
    const parsed = resumeTailorApproveRequestSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const base = await getResume(supabase, user!.id, parsed.data.baseResumeId);
    if (!base) return jsonError("Base resume not found", 404);

    const resume = await createResume(supabase, user!.id, {
      version_label: parsed.data.version_label,
      content_json: parsed.data.content_json,
      is_base_resume: false,
      tailored_for_application_id: parsed.data.applicationId ?? null,
    });

    return jsonData({ resume }, 201);
  } catch (e) {
    return jsonError(
      e instanceof Error ? e.message : "Failed to approve tailored resume",
      500
    );
  }
}
