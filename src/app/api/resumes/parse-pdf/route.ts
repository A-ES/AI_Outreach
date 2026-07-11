import { NextRequest } from "next/server";
import { jsonData, jsonError, requireUser } from "@/lib/api/helpers";
import { createResumeParserService } from "@/lib/services/resume-parser-service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { user, db } = requireUser();

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return jsonError("PDF file is required");
    if (file.type && file.type !== "application/pdf") {
      return jsonError("Only PDF files are supported");
    }

    const service = createResumeParserService({ db, userId: user.id });
    const content = await service.parsePdf(file);
    return jsonData({ content });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Failed to parse PDF", 500);
  }
}
