import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/sqlite";

const USER_ID = "local";

export function requireUser() {
  const db = getDb();
  return {
    user: { id: USER_ID },
    db,
    error: null,
  };
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function jsonData<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}
