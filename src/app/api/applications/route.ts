import { NextRequest } from "next/server";
import { jsonData, jsonError, requireUser } from "@/lib/api/helpers";
import { listApplications, createApplication } from "@/lib/db/applications";
import { applicationCreateSchema } from "@/lib/validation/schemas";

export async function GET() {
  const { user, db } = requireUser();

  try {
    const applications = listApplications(db, user.id);
    return jsonData({ applications });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Failed to fetch applications", 500);
  }
}

export async function POST(request: NextRequest) {
  const { user, db } = requireUser();

  try {
    const body = await request.json();
    const parsed = applicationCreateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const application = createApplication(db, user.id, parsed.data);
    return jsonData({ application }, 201);
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Failed to create application", 500);
  }
}
