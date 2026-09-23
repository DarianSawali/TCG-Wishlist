import { NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

async function savedCards(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("collections")
    .select("cards")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return Array.isArray(data?.cards) ? data.cards : [];
}

function profile(user: { email?: string; user_metadata?: Record<string, unknown> }) {
  return {
    name: String(
      user.user_metadata?.name ||
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "Collector",
    ),
    email: user.email || "",
  };
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user)
      return Response.json({ user: null }, { status: 401 });
    return Response.json({
      user: profile(data.user),
      cards: await savedCards(data.user.id),
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not load account." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const name = String(body.name || "Collector").trim() || "Collector";
  if (!email || password.length < 8) {
    return Response.json(
      { error: "Use a valid email and a password with at least 8 characters." },
      { status: 400 },
    );
  }

  try {
    const supabase = await createSupabaseServerClient();
    const result =
      body.mode === "register"
        ? await supabase.auth.signUp({ email, password, options: { data: { name } } })
        : await supabase.auth.signInWithPassword({ email, password });
    if (result.error) throw result.error;
    if (!result.data.user || !result.data.session) {
      return Response.json(
        { error: "Check your email to confirm the account, then sign in." },
        { status: 202 },
      );
    }
    return Response.json({
      user: profile(result.data.user),
      cards: await savedCards(result.data.user.id),
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not authenticate." },
      { status: 400 },
    );
  }
}

export async function DELETE() {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();
  return error
    ? Response.json({ error: error.message }, { status: 400 })
    : Response.json({ ok: true });
}
