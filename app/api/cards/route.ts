import { NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function PUT(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data, error: authError } = await supabase.auth.getUser();
  if (authError || !data.user)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  if (!Array.isArray(body.cards) || body.cards.length > 1000)
    return Response.json({ error: "Invalid cards" }, { status: 400 });

  const { error } = await supabase.from("collections").upsert(
    {
      user_id: data.user.id,
      cards: body.cards,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  return error
    ? Response.json({ error: error.message }, { status: 500 })
    : Response.json({ ok: true });
}
