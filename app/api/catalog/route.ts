import { NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/supabase/server";
import { normalizeRarity } from "@/lib/rarity";

type PokeWalletSet = {
  name: string;
  set_code?: string | null;
  set_id: string;
  card_count?: number;
  language?: string | null;
};

type PokeWalletResult = {
  id?: string;
  card_info?: {
    name?: string;
    clean_name?: string;
    set_name?: string;
    set_code?: string;
    set_id?: string;
    card_number?: string;
    rarity?: string;
    product_type?: string;
  };
  tcgplayer?: {
    prices?: Array<{ market_price?: number; low_price?: number }>;
  } | null;
  cardmarket?: {
    prices?: Array<{ low?: number; trend?: number; avg?: number }>;
  } | null;
};

const searchWords = (value = "") =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

function parseCardAndSetQuery(query: string, sets: PokeWalletSet[]) {
  const words = searchWords(query);
  if (words.length < 2) return { cardQuery: query, setIds: null };

  let best:
    | { cardQuery: string; setIds: Set<string>; qualifierLength: number }
    | undefined;
  for (let split = 1; split < words.length; split += 1) {
    const qualifier = words.slice(split);
    if (qualifier.some((word) => word.length < 3)) continue;
    const matches = sets.filter((set) => {
      const code = String(set.set_code || "");
      const expandedCode = code.replace(/(\d{2})$/i, "20$1");
      const setTerms = searchWords(`${code} ${expandedCode} ${set.name}`);
      return qualifier.every((word) =>
        setTerms.some((term) => term.startsWith(word) || word.startsWith(term)),
      );
    });
    if (!matches.length) continue;
    if (!best || qualifier.length > best.qualifierLength) {
      best = {
        cardQuery: words.slice(0, split).join(" "),
        setIds: new Set(matches.map((set) => set.set_id)),
        qualifierLength: qualifier.length,
      };
    }
  }
  return best || { cardQuery: query, setIds: null };
}

async function getJapaneseSets(apiKey: string) {
  const response = await fetch("https://api.pokewallet.io/sets", {
    headers: { "X-API-Key": apiKey },
    next: { revalidate: 86400 },
  });
  if (!response.ok)
    throw new Error("PokeWallet sets are temporarily unavailable.");
  const result = await response.json();
  return ((result.data || []) as PokeWalletSet[]).filter(
    (set) => set.language?.toLowerCase() === "jap",
  );
}

export async function GET(request: NextRequest) {
  if (!(await getCurrentUser())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.POKEWALLET_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "PokeWallet is not configured." },
      { status: 503 },
    );
  }

  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query || query.length < 2) return Response.json({ cards: [] });
  const page = Math.max(
    1,
    Number(request.nextUrl.searchParams.get("page")) || 1,
  );
  const pageSize = 100;

  try {
    const japaneseSets = await getJapaneseSets(apiKey);
    const setsById = new Map(japaneseSets.map((set) => [set.set_id, set]));
    const setsByCode = new Map(
      japaneseSets
        .filter((set) => set.set_code)
        .map((set) => [set.set_code!.toLowerCase(), set]),
    );
    const parsedQuery = parseCardAndSetQuery(query, japaneseSets);
    const normalizedCardQuery = searchWords(parsedQuery.cardQuery).join(" ");
    const searchUrl = new URL("https://api.pokewallet.io/search");
    searchUrl.searchParams.set("q", query);
    searchUrl.searchParams.set("page", String(page));
    searchUrl.searchParams.set("limit", String(pageSize));
    const response = await fetch(searchUrl, {
      headers: { "X-API-Key": apiKey },
      next: { revalidate: 3600 },
    });
    if (!response.ok)
      throw new Error("PokeWallet search is temporarily unavailable.");
    const result = await response.json();

    const cards = ((result.results || []) as PokeWalletResult[])
      .filter((card) => {
        if (!card.id || card.card_info?.product_type !== "card") return false;
        const setId = String(card.card_info?.set_id || "");
        const setCode = String(card.card_info?.set_code || "").toLowerCase();
        const japaneseSet = setsById.get(setId) || setsByCode.get(setCode);
        if (!japaneseSet) return false;
        if (parsedQuery.setIds && !parsedQuery.setIds.has(japaneseSet.set_id)) {
          return false;
        }
        if (parsedQuery.setIds) {
          const normalizedName = searchWords(
            `${card.card_info?.name || ""} ${card.card_info?.clean_name || ""}`,
          ).join(" ");
          return normalizedName.includes(normalizedCardQuery);
        }
        return true;
      })
      .map((card) => {
        const info = card.card_info!;
        const japaneseSet =
          setsById.get(String(info.set_id || "")) ||
          setsByCode.get(String(info.set_code || "").toLowerCase());
        const prices = [
          ...(card.tcgplayer?.prices || []).flatMap((price) => [
            price.market_price,
            price.low_price,
          ]),
          ...(card.cardmarket?.prices || []).flatMap((price) => [
            price.low,
            price.trend,
            price.avg,
          ]),
        ].filter(
          (price): price is number => typeof price === "number" && price > 0,
        );
        const rarity = normalizeRarity(info.rarity);
        const name = info.name || info.clean_name || "Unknown card";
        return {
          id: `pokewallet:${card.id}`,
          name,
          japanese: "Japanese printing",
          set: info.set_name || japaneseSet?.name || "Japanese Pokémon",
          setId: japaneseSet ? `pokewallet:${japaneseSet.set_id}` : undefined,
          setTotal: Number(japaneseSet?.card_count || 0),
          number: info.card_number || "—",
          rarity: rarity.label,
          rarityCode: rarity.code,
          price: prices.length ? Math.min(...prices) : 0,
          image: `/api/pokewallet-image/${encodeURIComponent(card.id!)}`,
          owned: false,
          priority: false,
          quantity: 1,
          condition: "NM",
          purchasePrice: 0,
          notes: "",
          addedAt: new Date().toISOString(),
          priceSource: prices.length ? "PokeWallet market data" : null,
        };
      });

    const totalPages = Number(result.pagination?.total_pages || page);
    return Response.json({
      cards,
      pagination: { page, hasMore: page < totalPages, totalPages },
      interpretedQuery: parsedQuery.setIds
        ? { card: parsedQuery.cardQuery, setMatch: true }
        : null,
      pricingAvailable: true,
      pricingMatched: cards.filter((card) => card.price > 0).length,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Card search failed." },
      { status: 502 },
    );
  }
}
