import { NextRequest } from "next/server";
import { jsonData, jsonError, requireUser } from "@/lib/api/helpers";
import { createResume, getResume } from "@/lib/db/resumes";
import { resumeTailorApproveRequestSchema } from "@/lib/validation/resume";

export async function POST(request: NextRequest) {
  const { user, db } = requireUser();

  try {
    const body = await request.json();
    const parsed = resumeTailorApproveRequestSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const base = getResume(db, user.id, parsed.data.baseResumeId);
    if (!base) return jsonError("Base resume not found", 404);

    const resume = createResume(db, user.id, {
      version_label: parsed.data.version_label,
      content_json: parsed.data.content_json,
      is_base_resume: false,
      tailored_for_application_id: parsed.data.applicationId ?? null,
    });

    return jsonData({ resume }, 201);
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Failed to approve tailored resume", 500);
  }
}
