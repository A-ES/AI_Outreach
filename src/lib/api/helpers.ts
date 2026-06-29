import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, supabase, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  return { user, supabase, error: null };
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function jsonData<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}
