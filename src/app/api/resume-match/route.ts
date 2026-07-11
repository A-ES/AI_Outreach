import { NextRequest } from "next/server";
import { jsonData, jsonError, requireUser } from "@/lib/api/helpers";
import { listResumeMatchResultsByApplication } from "@/lib/db/resume-match-results";
import {
  createResumeMatchService,
  resolveResumeTextFromDb,
} from "@/lib/services/resume-match-service";
import { resumeMatchAnalyzeRequestSchema } from "@/lib/validation/resume-match";

export async function GET(request: NextRequest) {
  const { user, db } = requireUser();

  const applicationId = request.nextUrl.searchParams.get("applicationId");
  if (!applicationId) {
    return jsonError("applicationId query parameter is required");
  }

  try {
    const results = listResumeMatchResultsByApplication(db, user.id, applicationId);
    return jsonData({ results });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Failed to fetch match results", 500);
  }
}

export async function POST(request: NextRequest) {
  const { user, db } = requireUser();

  try {
    const body = await request.json();
    const parsed = resumeMatchAnalyzeRequestSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const { jobDescriptionText, resumeText, applicationId, resumeId } = parsed.data;

    const service = createResumeMatchService({
      db,
      userId: user.id,
      applicationId: applicationId ?? null,
      resolveResumeText: (id) => resolveResumeTextFromDb(db, user.id, id, resumeText),
    });

    const result = await service.analyze(resumeId ?? null, jobDescriptionText);

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

    return jsonData({ status: "success", result: result.result, logId: result.logId }, 201);
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Failed to analyze resume match", 500);
  }
}
