import { NextRequest } from "next/server";
import { jsonData, jsonError, requireUser } from "@/lib/api/helpers";
import { getResume, setBaseResume } from "@/lib/db/resumes";

type RouteContext = { params: { id: string } };

export async function POST(_request: NextRequest, context: RouteContext) {
  const { user, db } = requireUser();

  try {
    const existing = getResume(db, user.id, context.params.id);
    if (!existing) return jsonError("Resume not found", 404);

    const resume = setBaseResume(db, user.id, context.params.id);
    return jsonData({ resume });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Failed to set base resume", 500);
  }
}
