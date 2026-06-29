import { NextRequest } from "next/server";
import { jsonData, jsonError, requireUser } from "@/lib/api/helpers";
import {
  createResume,
  getBaseResume,
  listResumes,
} from "@/lib/db/resumes";
import { createResumeRequestSchema } from "@/lib/validation/resume";

export async function GET() {
  const { user, supabase, error } = await requireUser();
  if (error) return error;

  try {
    const resumes = await listResumes(supabase, user!.id);
    const baseResume = await getBaseResume(supabase, user!.id);
    return jsonData({ resumes, baseResumeId: baseResume?.id ?? null });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Failed to list resumes", 500);
  }
}

export async function POST(request: NextRequest) {
  const { user, supabase, error } = await requireUser();
  if (error) return error;

  try {
    const body = await request.json();
    const parsed = createResumeRequestSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const resume = await createResume(supabase, user!.id, {
      version_label: parsed.data.version_label,
      content_json: parsed.data.content_json,
      is_base_resume: parsed.data.is_base_resume ?? false,
    });

    return jsonData({ resume }, 201);
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Failed to create resume", 500);
  }
}
