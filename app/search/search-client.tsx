"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { CurrencyControl } from "@/app/components/currency-control";
import { useCurrency } from "@/lib/use-currency";

/* eslint-disable @next/next/no-img-element -- catalogue images use dynamic provider URLs */

type ResultCard = {
  id: string;
  name: string;
  japanese: string;
  set: string;
  number: string;
  rarity: string;
  rarityCode?: string;
  price: number;
  image: string;
  setId?: string;
  setTotal?: number;
  owned?: boolean;
  priority?: boolean;
  quantity?: number;
  wishlistQuantity?: number;
  ownedQuantity?: number;
  condition?: "NM" | "LP" | "MP" | "HP" | "DMG";
  purchasePrice?: number;
  notes?: string;
  addedAt?: string;
  priceSource?: string | null;
};

const savedWishlistCount = (card?: ResultCard) =>
  card
    ? Math.max(
        0,
        card.wishlistQuantity ?? (card.owned ? 0 : card.quantity || 1),
      )
    : 0;

const savedOwnedCount = (card?: ResultCard) =>
  card
    ? Math.max(0, card.ownedQuantity ?? (card.owned ? card.quantity || 1 : 0))
    : 0;

function ActionIcon({ name }: { name: "heart" | "owned" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {name === "heart" ? (
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.9-8.6a5.5 5.5 0 0 0-.1-7.8Z" />
      ) : (
        <>
          <path d="m21 8-9 5-9-5" />
          <path d="M3 8l9-5 9 5v8l-9 5-9-5Z" />
          <path d="M12 13v8" />
          <path d="m8.5 8 2 2 4-4" />
        </>
      )}
    </svg>
  );
}

export default function SearchClient({
  initialQuery,
}: {
  initialQuery: string;
}) {
  const [input, setInput] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [cards, setCards] = useState<ResultCard[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(Boolean(initialQuery));
  const [error, setError] = useState("");
  const [rarity, setRarity] = useState("all");
  const [savedCards, setSavedCards] = useState<ResultCard[]>([]);
  const [savingId, setSavingId] = useState("");
  const { currency, setCurrency, formatPrice } = useCurrency();
  const rarities = useMemo(
    () => [...new Set(cards.map((card) => card.rarity).filter(Boolean))].sort(),
    [cards],
  );
  const visibleCards = useMemo(
    () =>
      rarity === "all" ? cards : cards.filter((card) => card.rarity === rarity),
    [cards, rarity],
  );

  useEffect(() => {
    fetch("/api/auth")
      .then(async (response) => (response.ok ? response.json() : null))
      .then((data) => setSavedCards(data?.cards || []))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) return;
    const controller = new AbortController();
    fetch(`/api/catalog?q=${encodeURIComponent(query)}&page=1`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Search failed.");
        return data;
      })
      .then((data) => {
        setCards(data.cards || []);
        setPage(1);
        setHasMore(Boolean(data.pagination?.hasMore));
        setError("");
      })
      .catch((caught) => {
        if (!controller.signal.aborted)
          setError(caught instanceof Error ? caught.message : "Search failed.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [query]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const next = input.trim();
    if (next.length < 2) return;
    window.history.pushState({}, "", `/search?q=${encodeURIComponent(next)}`);
    setLoading(true);
    setQuery(next);
  }

  async function loadMore() {
    const nextPage = page + 1;
    setLoading(true);
    try {
      const response = await fetch(
        `/api/catalog?q=${encodeURIComponent(query)}&page=${nextPage}`,
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Search failed.");
      setCards((current) =>
        [...current, ...(data.cards || [])].filter(
          (card, index, all) =>
            all.findIndex((item) => item.id === card.id) === index,
        ),
      );
      setPage(nextPage);
      setHasMore(Boolean(data.pagination?.hasMore));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Search failed.");
    } finally {
      setLoading(false);
    }
  }

  async function saveCard(card: ResultCard, destination: "wishlist" | "owned") {
    setSavingId(card.id);
    setError("");
    const existing = savedCards.find((item) => item.id === card.id);
    const nextCard: ResultCard = {
      ...card,
      ...existing,
      wishlistQuantity:
        savedWishlistCount(existing) + (destination === "wishlist" ? 1 : 0),
      ownedQuantity:
        savedOwnedCount(existing) + (destination === "owned" ? 1 : 0),
      owned: savedOwnedCount(existing) + (destination === "owned" ? 1 : 0) > 0,
      priority: existing?.priority || false,
      quantity: undefined,
      condition: existing?.condition || "NM",
      purchasePrice: existing?.purchasePrice || 0,
      notes: existing?.notes || "",
      addedAt: existing?.addedAt || new Date().toISOString(),
    };
    const nextCards = existing
      ? savedCards.map((item) => (item.id === card.id ? nextCard : item))
      : [nextCard, ...savedCards];
    try {
      const response = await fetch("/api/cards", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cards: nextCards }),
      });
      if (!response.ok) throw new Error("Could not save this card.");
      setSavedCards(nextCards);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not save card.",
      );
    } finally {
      setSavingId("");
    }
  }

  return (
    <main className="search-page">
      <header>
        <Link href="/" className="search-back">
          ← Back to collection
        </Link>
        <span className="search-wordmark">
          PokeCell <small>Japanese card vault</small>
        </span>
        <CurrencyControl currency={currency} onChange={setCurrency} />
      </header>
      <section className="search-hero">
        <p>COMPLETE JAPANESE CATALOGUE</p>
        <h1>Search every card</h1>
        <form onSubmit={submit}>
          <span>⌕</span>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Pikachu WCS, Espeon Terastal, M6A…"
            autoFocus
          />
          <button type="submit">Search</button>
        </form>
        {query && (
          <small>
            Results for “{query}” · {cards.length} loaded
          </small>
        )}
        {cards.length > 0 && (
          <label className="search-rarity-filter">
            <span>Rarity</span>
            <select
              value={rarity}
              onChange={(event) => setRarity(event.target.value)}
            >
              <option value="all">All rarities</option>
              {rarities.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        )}
      </section>
      {error && <div className="search-page-error">{error}</div>}
      <section className="search-page-grid">
        {visibleCards.map((card) => {
          const saved = savedCards.find((item) => item.id === card.id);
          const saving = savingId === card.id;
          return (
            <article key={card.id}>
              <div className="search-page-image">
                {card.image ? (
                  <img src={card.image} alt={`${card.name} Japanese card`} />
                ) : (
                  <span>
                    IMAGE
                    <br />
                    UNAVAILABLE
                  </span>
                )}
              </div>
              <div className="search-page-card-copy">
                <div>
                  <span>{card.rarityCode || card.rarity}</span>
                  <strong>
                    {card.price ? formatPrice(card.price) : "—"}
                  </strong>
                </div>
                <h2>{card.name}</h2>
                <p lang="ja">{card.japanese}</p>
                <small>
                  {card.set} · #{card.number}
                </small>
                <div className="search-card-actions">
                  <button
                    className={savedWishlistCount(saved) > 0 ? "active" : ""}
                    disabled={saving}
                    onClick={() => saveCard(card, "wishlist")}
                    title="Add to wishlist"
                    aria-label={`Add ${card.name} to wishlist`}
                  >
                    <ActionIcon name="heart" />
                  </button>
                  <button
                    className={savedOwnedCount(saved) > 0 ? "active owned" : ""}
                    disabled={saving}
                    onClick={() => saveCard(card, "owned")}
                    title="Add to owned collection"
                    aria-label={`Add ${card.name} to owned collection`}
                  >
                    <ActionIcon name="owned" />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </section>
      {loading && <div className="search-page-status">Loading cards…</div>}
      {!loading && !error && query && cards.length === 0 && (
        <div className="search-page-status">No Japanese cards found.</div>
      )}
      {!loading && hasMore && (
        <button className="search-page-more" onClick={loadMore}>
          Load more cards
        </button>
      )}
    </main>
  );
}
