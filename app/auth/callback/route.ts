import { NextRequest, NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const flowId = request.nextUrl.searchParams.get("sb_flow_id");
  const destination = new URL("/", request.nextUrl.origin);

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(
      code,
      flowId ? { flowId } : undefined,
    );
    if (!error) return NextResponse.redirect(destination);
    destination.searchParams.set("auth_error", error.message);
    return NextResponse.redirect(destination);
  }

  destination.searchParams.set(
    "auth_error",
    request.nextUrl.searchParams.get("error_description") ||
      "Google did not return an authorization code.",
  );
  return NextResponse.redirect(destination);
}
