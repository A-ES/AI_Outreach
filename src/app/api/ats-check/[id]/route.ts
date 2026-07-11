import { NextRequest } from "next/server";
import { jsonData, jsonError, requireUser } from "@/lib/api/helpers";
import { deleteAtsCheckResult } from "@/lib/db/ats-check-results";

type RouteContext = { params: { id: string } };

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { user, db } = requireUser();

  try {
    deleteAtsCheckResult(db, user.id, context.params.id);
    return jsonData({ success: true });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Failed to delete ATS check result", 500);
  }
}
