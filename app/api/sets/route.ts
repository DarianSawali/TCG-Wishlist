import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { tcgdex } from "@/lib/tcgdex";
import { normalizeRarity } from "@/lib/rarity";

const justHeaders = () =>
  process.env.JUSTTCG_API_KEY
    ? { "x-api-key": process.env.JUSTTCG_API_KEY }
    : null;

// TCGdex is authoritative for Japanese cards, but its set names are
// Japanese-only. These aliases cover sets that JustTCG cannot join by code.
const englishSetAliases: Record<string, string> = {
  sv8a: "Terastal Festival ex",
};

async function getJustSets(query?: string) {
  const headers = justHeaders();
  if (!headers) return [];
  const params = new URLSearchParams({ game: "pokemon-japan" });
  if (query) params.set("q", query);
  const response = await fetch(`https://api.justtcg.com/v1/sets?${params}`, {
    headers,
    next: { revalidate: 3600 },
  });
  return response.ok ? (await response.json()).data || [] : [];
}

type PokeWalletSet = {
  name: string;
  set_code?: string | null;
  set_id: string;
  card_count?: number;
  language?: string | null;
  release_date?: string | null;
};

type PokeWalletCard = {
  id?: string;
  card_info?: {
    name?: string;
    card_number?: string;
    rarity?: string;
    product_type?: string;
  };
  tcgplayer?: {
    url?: string;
    prices?: Array<{ market_price?: number }>;
  } | null;
  cardmarket?: {
    prices?: Array<{ low?: number; avg?: number; trend?: number }>;
  } | null;
};

async function getPokeWalletSets(): Promise<PokeWalletSet[]> {
  if (!process.env.POKEWALLET_API_KEY) return [];
  const response = await fetch("https://api.pokewallet.io/sets", {
    headers: { "X-API-Key": process.env.POKEWALLET_API_KEY },
    next: { revalidate: 86400 },
  });
  if (!response.ok) return [];
  const result = await response.json();
  return (result.data || []).filter(
    (set: PokeWalletSet) => set.language?.toLowerCase() === "jap",
  );
}

const cleanSetName = (name = "") => name.replace(/^[^:]+:\s*/, "").trim();

export async function GET(request: NextRequest) {
  if (!(await getCurrentUser()))
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const setId = request.nextUrl.searchParams.get("id")?.trim();
  try {
    if (!setId) {
      const pokeWalletSets = await getPokeWalletSets();
      if (pokeWalletSets.length) {
        const releaseTime = (value?: string | null) =>
          Date.parse(String(value || "").replace("Decembre", "December")) || 0;
        const sets = [...pokeWalletSets]
          .sort(
            (first, second) =>
              releaseTime(second.release_date) -
              releaseTime(first.release_date),
          )
          .map((set) => ({
            id: `pokewallet:${set.set_id}`,
            name: set.name,
            englishName: cleanSetName(set.name),
            releaseDate: set.release_date || undefined,
            cardCount: {
              total: Number(set.card_count || 0),
              official: Number(set.card_count || 0),
            },
            source: "pokewallet",
          }));
        return Response.json({ sets });
      }

      const [sets, justSets] = await Promise.all([
        tcgdex.set.list(),
        getJustSets(),
      ]);
      const justByCode = new Map(
        justSets.map((set: { name: string }) => [
          set.name.split(":")[0].trim().toLowerCase(),
          set,
        ]),
      );
      const tcgdexSets = [...sets].reverse().map((set) => {
        const normalizedSetId = set.id.toLowerCase();
        const englishName =
          (
            justByCode.get(normalizedSetId) as { name?: string } | undefined
          )?.name?.replace(/^[^:]+:\s*/, "") ||
          englishSetAliases[normalizedSetId];
        return {
          id: set.id,
          name: englishName ? `${englishName} · ${set.name}` : set.name,
          japaneseName: set.name,
          englishName,
          logo: set.logo,
          symbol: set.symbol,
          cardCount: {
            total: set.cardCount.total,
            official: set.cardCount.official,
          },
          source: "tcgdex",
        };
      });
      const knownCodes = new Set(sets.map((set) => set.id.toLowerCase()));
      const justOnlySets = justSets
        .filter((set: { name: string; release_date?: string }) => {
          const code = set.name.split(":")[0].trim().toLowerCase();
          return code && !knownCodes.has(code);
        })
        .sort((a: { release_date?: string }, b: { release_date?: string }) =>
          String(b.release_date || "").localeCompare(
            String(a.release_date || ""),
          ),
        )
        .map((set: { id: string; name: string; release_date?: string }) => ({
          id: `justtcg:${set.id}`,
          name: set.name,
          englishName: set.name.replace(/^[^:]+:\s*/, ""),
          releaseDate: set.release_date?.slice(0, 10),
          cardCount: { total: 0, official: 0 },
          source: "justtcg",
        }));
      const recentJustSets = justOnlySets.filter(
        (set: { releaseDate?: string }) =>
          String(set.releaseDate || "") >= "2026-01-01",
      );
      const supplementalJustSets = justOnlySets.filter(
        (set: { releaseDate?: string }) =>
          String(set.releaseDate || "") < "2026-01-01",
      );
      return Response.json({
        sets: [...recentJustSets, ...tcgdexSets, ...supplementalJustSets],
      });
    }
    if (setId.startsWith("pokewallet:")) {
      const pokeWalletSetId = setId.slice("pokewallet:".length);
      const apiKey = process.env.POKEWALLET_API_KEY;
      if (!apiKey) {
        return Response.json(
          { error: "PokeWallet is not configured." },
          { status: 503 },
        );
      }

      const pageSize = 20;
      const page = Math.max(
        1,
        Number(request.nextUrl.searchParams.get("page")) || 1,
      );
      const response = await fetch(
        `https://api.pokewallet.io/sets/${encodeURIComponent(pokeWalletSetId)}?${new URLSearchParams({ page: String(page), limit: String(pageSize) })}`,
        {
          headers: { "X-API-Key": apiKey },
          next: { revalidate: 3600 },
        },
      );
      if (!response.ok) {
        return Response.json(
          { error: "This PokeWallet set is temporarily unavailable." },
          { status: response.status },
        );
      }

      const result = await response.json();
      if (result.disambiguation || !result.set) {
        return Response.json({ error: "Set not found." }, { status: 404 });
      }

      const setCode = String(result.set.set_code || "");
      let japaneseSetName = "";
      const japaneseNames = new Map<string, string>();
      if (setCode) {
        try {
          const tcgdexSet = await tcgdex.set.get(setCode);
          japaneseSetName = tcgdexSet?.name || "";
          for (const card of tcgdexSet?.cards || []) {
            const number = String(card.localId).replace(/^0+/, "") || "0";
            japaneseNames.set(number, card.name);
          }
        } catch {
          // PokeWallet remains authoritative; Japanese text is best-effort.
        }
      }

      const cards = ((result.cards || []) as PokeWalletCard[])
        .filter(
          (card) =>
            card.id &&
            card.card_info?.product_type === "card" &&
            card.card_info.card_number,
        )
        .map((card) => {
          const cardNumber = String(card.card_info!.card_number);
          const localId = cardNumber.split("/")[0];
          const normalizedNumber = localId.replace(/^0+/, "") || "0";
          const prices = [
            ...(card.tcgplayer?.prices || []).map(
              (price) => price.market_price,
            ),
            ...(card.cardmarket?.prices || []).map(
              (price) => price.low ?? price.trend ?? price.avg,
            ),
          ].filter(
            (price): price is number => typeof price === "number" && price > 0,
          );
          const rarity = normalizeRarity(card.card_info?.rarity);
          const englishName =
            card.card_info?.name?.replace(/\s+\(\d+\/\d+\)$/, "") ||
            "Unknown card";
          return {
            id: `pokewallet:${card.id}`,
            localId,
            name: englishName,
            japaneseName: japaneseNames.get(normalizedNumber) || "",
            englishName,
            rarity: rarity.label,
            rarityCode: rarity.code,
            image: `/api/pokewallet-image/${encodeURIComponent(card.id!)}`,
            price: prices.length ? Math.min(...prices) : 0,
          };
        });
      const total = Number(result.pagination?.total || cards.length);

      return Response.json({
        set: {
          id: setId,
          name: result.set.name,
          japaneseName: japaneseSetName,
          englishName: cleanSetName(result.set.name),
          releaseDate: result.set.release_date,
          cardCount: {
            total: Number(result.set.total_cards || total),
            official: Number(result.set.total_cards || total),
          },
          serie: { id: "pokewallet", name: "Japanese Pokémon · PokeWallet" },
          source: "pokewallet",
          cards,
        },
        pagination: {
          page,
          pageSize,
          total,
          pages: Number(
            result.pagination?.total_pages || Math.ceil(total / pageSize),
          ),
        },
      });
    }
    if (setId.startsWith("justtcg:")) {
      const justSetId = setId.slice("justtcg:".length);
      const headers = justHeaders();
      if (!headers)
        return Response.json(
          { error: "JustTCG is not configured." },
          { status: 503 },
        );
      const pageSize = 20;
      const page = Math.max(
        1,
        Number(request.nextUrl.searchParams.get("page")) || 1,
      );
      const [setRecord] = (await getJustSets()).filter(
        (set: { id: string }) => set.id === justSetId,
      );
      if (!setRecord)
        return Response.json({ error: "Set not found." }, { status: 404 });
      const params = new URLSearchParams({
        game: "pokemon-japan",
        set: justSetId,
        limit: String(pageSize),
        offset: String((page - 1) * pageSize),
        include_null_prices: "true",
        language: "Japanese",
      });
      const cardResponse = await fetch(
        `https://api.justtcg.com/v1/cards?${params}`,
        { headers, next: { revalidate: 3600 } },
      );
      if (!cardResponse.ok)
        return Response.json(
          { error: "The latest set is temporarily unavailable." },
          { status: 502 },
        );
      const result = await cardResponse.json();
      const cards = (result.data || [])
        .filter(
          (card: { number?: string }) => card.number && card.number !== "N/A",
        )
        .map(
          (card: {
            id: string;
            uuid?: string;
            name: string;
            number: string;
            rarity?: string;
            tcgplayerId?: string;
            variants?: Array<{ price?: number }>;
          }) => {
            const prices = (card.variants || [])
              .map((variant) => variant.price)
              .filter(
                (price): price is number =>
                  typeof price === "number" && price > 0,
              );
            const rarity = normalizeRarity(card.rarity);
            return {
              id: `justtcg:${card.uuid || card.id}`,
              localId: card.number.split("/")[0],
              name: card.name,
              japaneseName: "",
              englishName: card.name.replace(/\s*\(\d+\/\d+\)$/, ""),
              rarity: rarity.label,
              rarityCode: rarity.code,
              image: card.tcgplayerId
                ? `https://tcgplayer-cdn.tcgplayer.com/product/${card.tcgplayerId}_in_1000x1000.jpg`
                : undefined,
              price: prices.length ? Math.min(...prices) : 0,
            };
          },
        );
      const total = Number(result.meta?.total || cards.length);
      return Response.json({
        set: {
          id: setId,
          name: setRecord.name,
          englishName: setRecord.name.replace(/^[^:]+:\s*/, ""),
          releaseDate: setRecord.release_date?.slice(0, 10),
          cardCount: { total, official: total },
          serie: {
            id: "mega",
            name: "Japanese Pokémon · Early access via JustTCG",
          },
          source: "justtcg",
          cards,
        },
        pagination: {
          page,
          pageSize,
          total,
          pages: Math.ceil(total / pageSize),
        },
      });
    }
    const data = await tcgdex.set.get(setId);
    if (!data)
      return Response.json({ error: "Set not found." }, { status: 404 });

    const pageSize = 20;
    const page = Math.max(
      1,
      Number(request.nextUrl.searchParams.get("page")) || 1,
    );
    const allJapaneseCards = Array.isArray(data.cards) ? data.cards : [];
    const pageBriefs = allJapaneseCards.slice(
      (page - 1) * pageSize,
      page * pageSize,
    );
    const pageCards = await Promise.all(
      pageBriefs.map(async (brief) => {
        const card = await brief.getCard();
        const tcgplayerId = card?.variantsDetailed?.find(
          (variant) => variant.thirdParty?.tcgplayer,
        )?.thirdParty?.tcgplayer;
        return {
          id: brief.id,
          localId: brief.localId,
          name: brief.name,
          image: card?.image ? card.getImageURL("high", "webp") : undefined,
          tcgplayerId,
          rarity: card?.rarity,
        };
      }),
    );
    const numberOnly = (value: string | number = "") =>
      String(value).split("/")[0].replace(/^0+/, "") || "0";
    const englishCards: Array<{
      name: string;
      number?: string;
      rarity?: string;
      tcgplayerId?: string;
      pokeWalletId?: string;
      variants?: Array<{ price?: number }>;
    }> = [];
    let englishSetName = englishSetAliases[setId.toLowerCase()];

    if (process.env.POKEWALLET_API_KEY && pageCards.length) {
      const pokeWalletSet = (await getPokeWalletSets()).find(
        (set) => set.set_code?.toLowerCase() === setId.toLowerCase(),
      );
      if (pokeWalletSet) {
        englishSetName = cleanSetName(pokeWalletSet.name) || englishSetName;
        const wantedNumbers = new Set(
          pageCards.map((card) => numberOnly(card.localId)),
        );
        const foundNumbers = new Set<string>();
        let pokeWalletPage = 1;
        let totalPages = 1;

        do {
          const response = await fetch(
            `https://api.pokewallet.io/sets/${encodeURIComponent(pokeWalletSet.set_id)}?${new URLSearchParams({ page: String(pokeWalletPage), limit: "200" })}`,
            {
              headers: { "X-API-Key": process.env.POKEWALLET_API_KEY },
              next: { revalidate: 86400 },
            },
          );
          if (!response.ok) break;
          const result = await response.json();
          totalPages = Number(result.pagination?.total_pages || 1);
          for (const item of (result.cards || []) as PokeWalletCard[]) {
            if (item.card_info?.product_type !== "card") continue;
            const cardNumber = numberOnly(item.card_info.card_number);
            if (!wantedNumbers.has(cardNumber)) continue;
            const tcgplayerId =
              item.tcgplayer?.url?.match(/product\/(\d+)/)?.[1];
            const prices = (item.tcgplayer?.prices || [])
              .map((price) => price.market_price)
              .filter((price): price is number => typeof price === "number");
            englishCards.push({
              name: item.card_info.name || "",
              number: item.card_info.card_number,
              rarity: item.card_info.rarity,
              tcgplayerId,
              pokeWalletId: item.id,
              variants: prices.map((price) => ({ price })),
            });
            foundNumbers.add(cardNumber);
          }
          pokeWalletPage += 1;
        } while (
          foundNumbers.size < wantedNumbers.size &&
          pokeWalletPage <= totalPages
        );
      }
    }

    if (process.env.JUSTTCG_API_KEY && pageCards.length) {
      const headers = { "x-api-key": process.env.JUSTTCG_API_KEY };
      const tcgplayerIds = [
        ...new Set(
          pageCards
            .map((card) => card.tcgplayerId)
            .filter((id): id is number => typeof id === "number"),
        ),
      ];

      if (tcgplayerIds.length) {
        const cardLookup = await fetch("https://api.justtcg.com/v1/cards", {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify(
            tcgplayerIds.map((tcgplayerId) => ({
              tcgplayerId: String(tcgplayerId),
            })),
          ),
          next: { revalidate: 86400 },
        });
        if (cardLookup.ok) {
          englishCards.push(...((await cardLookup.json()).data || []));
        }
      }

      const setSearch = await fetch(
        `https://api.justtcg.com/v1/sets?${new URLSearchParams({ game: "pokemon-japan", q: setId })}`,
        { headers, next: { revalidate: 86400 } },
      );
      if (setSearch.ok) {
        const justSets = (await setSearch.json()).data || [];
        const normalizedId = setId.toLowerCase().replace(/[^a-z0-9]/g, "");
        const justSet = justSets.find(
          (item: { id: string; name: string }) =>
            item.name.toLowerCase().startsWith(`${setId.toLowerCase()}:`) ||
            item.id
              .toLowerCase()
              .replace(/[^a-z0-9]/g, "")
              .startsWith(normalizedId),
        );
        if (justSet) {
          englishSetName ||= justSet.name.replace(/^[^:]+:\s*/, "");
        }
      }
    }
    const cards = pageCards.map((card) => {
      const match =
        englishCards.find(
          (item) =>
            card.tcgplayerId &&
            String(item.tcgplayerId) === String(card.tcgplayerId),
        ) ||
        englishCards.find(
          (item) =>
            item.number && numberOnly(item.number) === numberOnly(card.localId),
        );
      const prices = (match?.variants || [])
        .map((variant) => variant.price)
        .filter(
          (price): price is number => typeof price === "number" && price > 0,
        );
      const rarity = normalizeRarity(card.rarity);
      return {
        ...card,
        japaneseName: card.name,
        englishName:
          match?.name
            ?.replace(/\s+-\s+\d+\/\d+$/, "")
            .replace(/\s+\(\d+\/\d+\)$/, "") || card.name,
        image:
          card.image ||
          (card.tcgplayerId
            ? `https://tcgplayer-cdn.tcgplayer.com/product/${card.tcgplayerId}_in_1000x1000.jpg`
            : match?.tcgplayerId
              ? `https://tcgplayer-cdn.tcgplayer.com/product/${match.tcgplayerId}_in_1000x1000.jpg`
              : undefined),
        fallbackImage: match?.pokeWalletId
          ? `/api/pokewallet-image/${encodeURIComponent(match.pokeWalletId)}`
          : undefined,
        price: prices.length ? Math.min(...prices) : 0,
        rarity: rarity.label,
        rarityCode: rarity.code,
      };
    });
    return Response.json({
      set: {
        id: data.id,
        name: englishSetName ? `${englishSetName} · ${data.name}` : data.name,
        japaneseName: data.name,
        englishName: englishSetName,
        logo: data.logo,
        symbol: data.symbol,
        releaseDate: data.releaseDate,
        cardCount: {
          total: data.cardCount.total,
          official: data.cardCount.official,
        },
        serie: data.serie
          ? { id: data.serie.id, name: data.serie.name }
          : undefined,
        source: "tcgdex",
        cards,
      },
      pagination: {
        page,
        pageSize,
        total: allJapaneseCards.length,
        pages: Math.ceil(allJapaneseCards.length / pageSize),
      },
    });
  } catch {
    return Response.json(
      { error: "Could not load the Japanese card catalogue." },
      { status: 502 },
    );
  }
}
