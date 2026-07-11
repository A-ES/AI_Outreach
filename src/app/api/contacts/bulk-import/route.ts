import { NextRequest } from "next/server";
import { jsonData, jsonError, requireUser } from "@/lib/api/helpers";
import { createContact, listContacts } from "@/lib/db/contacts";
import {
  parseContactsCsv,
  toContactCreateInput,
  type ContactCsvPreviewRow,
} from "@/lib/csv/contacts";

export async function POST(request: NextRequest) {
  const { user, db } = requireUser();

  try {
    const body = await request.json();
    const csvText = typeof body.csvText === "string" ? body.csvText : "";
    const commit = body.commit === true;
    if (!csvText.trim()) return jsonError("CSV text is required");

    const existingContacts = listContacts(db, user.id);
    const existingEmails = new Set(
      existingContacts
        .map((contact) => contact.email?.toLowerCase())
        .filter((email): email is string => Boolean(email))
    );

    const preview = parseContactsCsv(csvText).map((row): ContactCsvPreviewRow => {
      if (row.input.email && existingEmails.has(row.input.email.toLowerCase())) {
        return {
          ...row,
          status: "duplicate",
          errors: [...row.errors, "Email already exists in contacts."],
        };
      }
      return row;
    });

    if (!commit) {
      return jsonData({ preview, summary: summarize(preview, 0) });
    }

    let succeeded = 0;
    let failed = 0;
    for (const row of preview) {
      if (row.status !== "ready") continue;
      try {
        createContact(db, user.id, toContactCreateInput(row));
        succeeded += 1;
      } catch {
        failed += 1;
        row.status = "invalid";
        row.errors.push("Failed to insert contact.");
      }
    }

    return jsonData({ preview, summary: summarize(preview, succeeded, failed) });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Failed to import contacts", 500);
  }
}

function summarize(rows: ContactCsvPreviewRow[], succeeded = 0, insertFailed = 0) {
  return {
    succeeded,
    failed: rows.filter((row) => row.status === "invalid").length + insertFailed,
    skipped_duplicates: rows.filter((row) => row.status === "duplicate").length,
    ready: rows.filter((row) => row.status === "ready").length,
  };
}
