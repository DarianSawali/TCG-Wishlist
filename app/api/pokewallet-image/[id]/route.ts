import { NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await getCurrentUser())) {
    return new Response("Unauthorized", { status: 401 });
  }

  const apiKey = process.env.POKEWALLET_API_KEY;
  if (!apiKey)
    return new Response("PokeWallet is not configured", { status: 503 });

  const { id } = await params;
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    return new Response("Invalid image ID", { status: 400 });
  }

  const upstream = await fetch(
    `https://api.pokewallet.io/images/${encodeURIComponent(id)}?size=high`,
    {
      headers: { "X-API-Key": apiKey },
      next: { revalidate: 31536000 },
    },
  );

  if (!upstream.ok || !upstream.body) {
    return new Response("Image unavailable", { status: upstream.status });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") || "image/jpeg",
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
