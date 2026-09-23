import { NextRequest, NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const callbackUrl = new URL("/auth/callback", request.nextUrl.origin);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callbackUrl.toString() },
  });

  if (error || !data.url) {
    const destination = new URL("/", request.nextUrl.origin);
    destination.searchParams.set("auth_error", "google_sign_in_failed");
    return NextResponse.redirect(destination);
  }

  return NextResponse.redirect(data.url);
}
