import { getCurrentUser } from "@/lib/supabase/server";

type ExchangeRateResponse = {
  result?: string;
  "error-type"?: string;
  time_last_update_utc?: string;
  time_next_update_utc?: string;
  conversion_rates?: Record<string, number>;
};

export async function GET() {
  if (!(await getCurrentUser()))
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.EXCHANGERATE_API_KEY;
  if (!apiKey)
    return Response.json(
      { error: "Currency conversion is not configured." },
      { status: 503 },
    );

  try {
    const response = await fetch(
      "https://v6.exchangerate-api.com/v6/latest/USD",
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        next: { revalidate: 86400 },
      },
    );
    const data = (await response.json()) as ExchangeRateResponse;
    if (
      !response.ok ||
      data.result !== "success" ||
      !data.conversion_rates?.CAD ||
      !data.conversion_rates?.JPY
    ) {
      throw new Error(data["error-type"] || "Exchange rates unavailable.");
    }
    return Response.json({
      base: "USD",
      rates: {
        USD: 1,
        CAD: data.conversion_rates.CAD,
        JPY: data.conversion_rates.JPY,
      },
      updatedAt: data.time_last_update_utc,
      nextUpdateAt: data.time_next_update_utc,
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Exchange rates unavailable.",
      },
      { status: 502 },
    );
  }
}
