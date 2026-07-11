import { NextRequest } from "next/server";
import { jsonData, jsonError, requireUser } from "@/lib/api/helpers";
import { createResumeTailorService } from "@/lib/services/resume-tailor-service";
import { resumeTailorRequestSchema } from "@/lib/validation/resume";

export async function POST(request: NextRequest) {
  const { user, db } = requireUser();

  try {
    const body = await request.json();
    const parsed = resumeTailorRequestSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const service = createResumeTailorService({
      db,
      userId: user.id,
      applicationId: parsed.data.applicationId ?? null,
      useFlashFallback: parsed.data.useFlashFallback,
      thinkingMode: parsed.data.thinkingMode,
    });

    const result = await service.tailor(
      parsed.data.baseResumeId,
      parsed.data.jobDescriptionText
    );

    if (result.status === "needs_review") {
      return jsonData(
        {
          status: "needs_review",
          step: result.step,
          validationErrors: result.validationErrors,
          logId: result.logId,
        },
        422
      );
    }

    return jsonData({
      status: "success",
      draft: {
        baseResumeId: result.baseResumeId,
        baseContent: result.baseContent,
        tailoredContent: result.tailoredContent,
        flaggedClaims: result.flaggedClaims,
        applicationId: parsed.data.applicationId ?? null,
      },
      meta: {
        tailorLogId: result.tailorLogId,
        hallucinationLogId: result.hallucinationLogId,
        modelUsed: result.modelUsed,
        thinkingMode: result.thinkingMode,
        tailorLatencyMs: result.tailorLatencyMs,
        hallucinationLatencyMs: result.hallucinationLatencyMs,
      },
    });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Failed to tailor resume", 500);
  }
}
