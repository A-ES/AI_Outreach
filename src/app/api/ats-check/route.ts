import { NextRequest } from "next/server";
import { jsonData, jsonError, requireUser } from "@/lib/api/helpers";
import { listAtsCheckResults } from "@/lib/db/ats-check-results";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { user, db } = requireUser();

  try {
    const resumeId = request.nextUrl.searchParams.get("resumeId");
    const results = listAtsCheckResults(db, user.id, resumeId);
    return jsonData({ results });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Failed to fetch ATS check history", 500);
  }
}

export async function POST(request: NextRequest) {
  const { user, db } = requireUser();

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const resumeId = formData.get("resumeId");
    if (!(file instanceof File)) return jsonError("PDF file is required");
    if (file.type && file.type !== "application/pdf") {
      return jsonError("Only PDF files are supported");
    }

    const { createAtsCheckService } = await import("@/lib/services/ats-check-service");
    const service = createAtsCheckService({
      db,
      userId: user.id,
      resumeId: typeof resumeId === "string" && resumeId ? resumeId : null,
    });
    const result = await service.check(file);
    return jsonData({ result }, 201);
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Failed to run ATS check", 500);
  }
}
