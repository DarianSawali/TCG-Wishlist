"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CurrencyControl } from "@/app/components/currency-control";
import { useCurrency } from "@/lib/use-currency";

type Card = {
  id: string;
  name: string;
  japanese: string;
  set: string;
  number: string;
  rarity: string;
  price: number;
  image: string;
  owned: boolean;
  priority: boolean;
  priceSource?: string | null;
  setId?: string;
  setTotal?: number;
  quantity?: number;
  wishlistQuantity?: number;
  ownedQuantity?: number;
  condition?: "NM" | "LP" | "MP" | "HP" | "DMG";
  purchasePrice?: number;
  notes?: string;
  addedAt?: string;
};

type JapaneseSet = {
  id: string;
  name: string;
  japaneseName?: string;
  englishName?: string;
  logo?: string;
  symbol?: string;
  releaseDate?: string;
  source?: "pokewallet" | "tcgdex" | "justtcg";
  cardCount: { total: number; official: number };
};
type SetCard = {
  id: string;
  localId: string;
  name: string;
  japaneseName?: string;
  englishName?: string;
  image?: string;
  fallbackImage?: string;
  price?: number;
  rarity?: string;
  rarityCode?: string;
};
type JapaneseSetDetail = JapaneseSet & {
  cards: SetCard[];
  serie?: { name: string };
};

const wishlistCount = (card: Card) =>
  Math.max(0, card.wishlistQuantity ?? (card.owned ? 0 : card.quantity || 1));

const ownedCount = (card: Card) =>
  Math.max(0, card.ownedQuantity ?? (card.owned ? card.quantity || 1 : 0));

const normalizeStoredCard = (card: Card): Card => ({
  ...card,
  wishlistQuantity: wishlistCount(card),
  ownedQuantity: ownedCount(card),
  owned: ownedCount(card) > 0,
  quantity: undefined,
});

function Icon({
  name,
  size = 19,
}: {
  name:
    | "grid"
    | "heart"
    | "box"
    | "settings"
    | "search"
    | "plus"
    | "sparkle"
    | "check"
    | "trash"
    | "x"
    | "collapse"
    | "moon"
    | "sun"
    | "menu";
  size?: number;
}) {
  const paths: Record<string, React.ReactNode> = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    heart: (
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
    ),
    box: (
      <>
        <path d="m21 8-9 5-9-5" />
        <path d="M3 8l9-5 9 5v8l-9 5-9-5Z" />
        <path d="M12 13v8" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14M5 12h14" />
      </>
    ),
    sparkle: (
      <path d="m12 3 1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4L12 3Zm6 11 .7 2.3L21 17l-2.3.7L18 20l-.7-2.3L15 17l2.3-.7L18 14Z" />
    ),
    check: <path d="m5 12 4 4L19 6" />,
    trash: (
      <>
        <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13" />
        <path d="M10 11v5M14 11v5" />
      </>
    ),
    x: <path d="m6 6 12 12M18 6 6 18" />,
    collapse: <path d="m14 6-6 6 6 6" />,
    moon: <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" />,
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </>
    ),
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {paths[name]}
    </svg>
  );
}

export default function Home() {
  const [cards, setCards] = useState<Card[]>([]);
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<
    { name: string; email: string } | null | undefined
  >(undefined);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<
    "all" | "wishlist" | "priority" | "owned"
  >("wishlist");
  const [sort, setSort] = useState<"recent" | "name" | "price" | "set">(
    "recent",
  );
  const [showAdd, setShowAdd] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [view, setView] = useState<"overview" | "sets">("overview");
  const [activeNav, setActiveNav] = useState<
    "overview" | "sets" | "wishlist" | "collection"
  >("wishlist");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const { currency, setCurrency, formatPrice } = useCurrency();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    fetch("/api/auth")
      .then(async (response) => {
        if (!response.ok) {
          setUser(null);
          return;
        }
        const data = await response.json();
        setUser(data.user);
        setCards(
          (data.cards || []).map((card: Card) => normalizeStoredCard(card)),
        );
        window.localStorage.removeItem("pokelist-cards");
      })
      .finally(() => setReady(true));
  }, []);
  useEffect(() => {
    if (!ready || !user) return;
    const timer = window.setTimeout(
      () =>
        fetch("/api/cards", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cards }),
        }),
      350,
    );
    return () => window.clearTimeout(timer);
  }, [cards, ready, user]);

  const visible = useMemo(() => {
    const filtered = cards.filter((card) => {
      const matches = `${card.name} ${card.japanese} ${card.set}`
        .toLowerCase()
        .includes(query.toLowerCase());
      return (
        matches &&
        (filter === "all" ||
          (filter === "wishlist" && wishlistCount(card) > 0) ||
          (filter === "priority" && card.priority) ||
          (filter === "owned" && ownedCount(card) > 0))
      );
    });
    return filtered.sort((first, second) => {
      if (sort === "name") return first.name.localeCompare(second.name);
      if (sort === "set") return first.set.localeCompare(second.set);
      if (sort === "price") return second.price - first.price;
      return String(second.addedAt || "").localeCompare(
        String(first.addedAt || ""),
      );
    });
  }, [cards, query, filter, sort]);
  const wishlistTotal = cards.reduce(
    (sum, card) => sum + wishlistCount(card),
    0,
  );
  const collectionTotal = cards.reduce(
    (sum, card) => sum + ownedCount(card),
    0,
  );
  const value = cards.reduce(
    (sum, card) => sum + card.price * wishlistCount(card),
    0,
  );
  function updateCard(id: string, update: Partial<Card>) {
    setCards((current) =>
      current.map((card) => (card.id === id ? { ...card, ...update } : card)),
    );
  }
  function addToWishlist(card: Card) {
    setCards((current) => {
      const existing = current.find((item) => item.id === card.id);
      if (!existing)
        return [
          normalizeStoredCard({
            ...card,
            wishlistQuantity: 1,
            ownedQuantity: 0,
          }),
          ...current,
        ];
      return current.map((item) =>
        item.id === card.id
          ? {
              ...item,
              wishlistQuantity: wishlistCount(item) + 1,
              owned: ownedCount(item) > 0,
            }
          : item,
      );
    });
  }

  function collectOne(card: Card) {
    updateCard(card.id, {
      wishlistQuantity: Math.max(0, wishlistCount(card) - 1),
      ownedQuantity: ownedCount(card) + 1,
      owned: true,
    });
  }

  function removeFromStorage(card: Card, storage: "wishlist" | "owned") {
    setCards((current) => {
      const nextWishlist = storage === "wishlist" ? 0 : wishlistCount(card);
      const nextOwned = storage === "owned" ? 0 : ownedCount(card);
      if (nextWishlist === 0 && nextOwned === 0) {
        return current.filter((item) => item.id !== card.id);
      }
      return current.map((item) =>
        item.id === card.id
          ? {
              ...item,
              wishlistQuantity: nextWishlist,
              ownedQuantity: nextOwned,
              owned: nextOwned > 0,
            }
          : item,
      );
    });
  }

  function activeStorage(card: Card): "wishlist" | "owned" {
    if (filter === "owned") return "owned";
    if (filter === "wishlist") return "wishlist";
    return wishlistCount(card) > 0 ? "wishlist" : "owned";
  }

  function changeActiveQuantity(card: Card, amount: number) {
    const storage = activeStorage(card);
    const current =
      storage === "wishlist" ? wishlistCount(card) : ownedCount(card);
    const next = Math.max(1, current + amount);
    updateCard(
      card.id,
      storage === "wishlist"
        ? { wishlistQuantity: next }
        : { ownedQuantity: next, owned: true },
    );
  }
  if (user === undefined)
    return (
      <div className="loading-screen">
        <span className="brand-mark">
          <span />
        </span>
        <p>Opening your collection…</p>
      </div>
    );
  if (user === null)
    return (
      <AuthScreen
        onSuccess={(account, savedCards) => {
          setUser(account);
          setCards(
            (savedCards || []).map((card) => normalizeStoredCard(card)),
          );
          setReady(true);
        }}
      />
    );

  return (
    <div
      className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}
    >
      <aside className={`sidebar ${mobileNavOpen ? "mobile-open" : ""}`}>
        <div className="brand">
          <span className="brand-mark">
            <span />
          </span>
          <span className="brand-copy">
            PokeCell<small>Japanese card vault</small>
          </span>
          <button
            className="sidebar-collapse"
            onClick={() => setSidebarCollapsed((current) => !current)}
            title={sidebarCollapsed ? "Expand navigation" : "Collapse navigation"}
            aria-label={sidebarCollapsed ? "Expand navigation" : "Collapse navigation"}
          >
            <Icon name="collapse" size={17} />
          </button>
          <button
            className="mobile-menu-toggle"
            onClick={() => setMobileNavOpen((current) => !current)}
            aria-expanded={mobileNavOpen}
            aria-controls="main-navigation"
            aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
          >
            <Icon name={mobileNavOpen ? "x" : "menu"} size={19} />
          </button>
        </div>
        <nav id="main-navigation" aria-label="Main navigation">
          <button
            className={`nav-item ${activeNav === "overview" ? "active" : ""}`}
            onClick={() => {
              setView("overview");
              setFilter("all");
              setActiveNav("overview");
              setMobileNavOpen(false);
            }}
            title="Overview"
          >
            <Icon name="grid" />
            <span className="nav-label">Overview</span>
          </button>
          <button
            className={`nav-item ${activeNav === "sets" ? "active" : ""}`}
            onClick={() => {
              setView("sets");
              setActiveNav("sets");
              setMobileNavOpen(false);
            }}
            title="Browse sets"
          >
            <Icon name="search" />
            <span className="nav-label">Browse sets</span>
          </button>
          <button
            className={`nav-item ${activeNav === "wishlist" ? "active" : ""}`}
            onClick={() => {
              setView("overview");
              setFilter("wishlist");
              setActiveNav("wishlist");
              setMobileNavOpen(false);
            }}
            title="Wishlist"
          >
            <Icon name="heart" />
            <span className="nav-label">Wishlist</span><span className="nav-count">{wishlistTotal}</span>
          </button>
          <button
            className={`nav-item ${activeNav === "collection" ? "active" : ""}`}
            onClick={() => {
              setView("overview");
              setFilter("owned");
              setActiveNav("collection");
              setMobileNavOpen(false);
            }}
            title="Collection"
          >
            <Icon name="box" />
            <span className="nav-label">Collection</span><span className="nav-count">{collectionTotal}</span>
          </button>
        </nav>
        <div className="sidebar-foot">
          <button className="nav-item" title="Settings">
            <Icon name="settings" />
            <span className="nav-label">Settings</span>
          </button>
          <button
            className="nav-item theme-toggle"
            onClick={() =>
              setTheme((current) => (current === "dark" ? "light" : "dark"))
            }
            title={`Use ${theme === "dark" ? "light" : "dark"} theme`}
          >
            <Icon name={theme === "dark" ? "sun" : "moon"} />
            <span className="nav-label">
              {theme === "dark" ? "Light theme" : "Dark theme"}
            </span>
          </button>
          <div className="storage">
            <span>Stored securely in Supabase</span>
            <i>
              <b />
            </i>
            <small>Your cards stay private</small>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p>MY COLLECTION</p>
            <h1>Good afternoon, {user.name.split(" ")[0]}.</h1>
          </div>
          <div className="top-actions">
            <CurrencyControl currency={currency} onChange={setCurrency} />
            <button
              className="account-pill"
              onClick={() => setShowLogoutConfirm(true)}
              title="Account options"
            >
              <span>{user.name.slice(0, 1).toUpperCase()}</span>
              <i>{user.email}</i>
            </button>
            <button className="add-button" onClick={() => setShowAdd(true)}>
              <Icon name="plus" /> Add a card
            </button>
          </div>
        </header>

        {view === "overview" ? (
          <>
            <section className="stats" aria-label="Collection summary">
              <article>
                <span className="stat-icon blush">
                  <Icon name="heart" />
                </span>
                <div>
                  <small>WISHLIST</small>
                  <strong>
                    {wishlistTotal}
                    <em> cards</em>
                  </strong>
                </div>
              </article>
              <article>
                <span className="stat-icon mint">
                  <Icon name="box" />
                </span>
                <div>
                  <small>COLLECTED</small>
                  <strong>
                    {collectionTotal}
                    <em> cards</em>
                  </strong>
                </div>
                <i className="muted">A lovely start</i>
              </article>
              <article>
                <span className="stat-icon butter">¥</span>
                <div>
                  <small>EST. WISHLIST VALUE</small>
                  <strong>
                    {formatPrice(value, { whole: true })}
                    <em> {currency}</em>
                  </strong>
                </div>
                <i className="muted">Ungraded estimate</i>
              </article>
            </section>

            <section className="collection-head">
              <div>
                <h2>
                  {filter === "owned"
                    ? "Your collection"
                    : filter === "wishlist"
                      ? "Your wishlist"
                      : "All your cards"}
                </h2>
                <p>
                  {filter === "owned"
                    ? "The Japanese cards you currently own."
                    : filter === "wishlist"
                      ? "The Japanese cards you’re keeping an eye on."
                      : "Your wishlist and collection in one place."}
                </p>
              </div>
              <div className="tools">
                <label className="search">
                  <Icon name="search" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search cards..."
                    aria-label="Search cards"
                  />
                </label>
                <div className="filters">
                  {(["wishlist", "all", "priority", "owned"] as const).map(
                    (item) => (
                      <button
                        key={item}
                        className={filter === item ? "selected" : ""}
                        onClick={() => {
                          setFilter(item);
                          if (item === "wishlist") setActiveNav("wishlist");
                          else if (item === "owned") setActiveNav("collection");
                          else setActiveNav("overview");
                        }}
                      >
                        {item === "all"
                          ? "All cards"
                          : item === "wishlist"
                            ? "Wishlist"
                            : item === "priority"
                              ? "Priority"
                              : "Owned"}
                      </button>
                    ),
                  )}
                </div>
                <label className="sort-control">
                  <span>Sort</span>
                  <select
                    value={sort}
                    onChange={(event) =>
                      setSort(event.target.value as typeof sort)
                    }
                  >
                    <option value="recent">Recently added</option>
                    <option value="name">Name</option>
                    <option value="price">Price</option>
                    <option value="set">Set</option>
                  </select>
                </label>
              </div>
            </section>

            {/* eslint-disable @next/next/no-img-element -- supports user-provided remote image URLs */}
            <section className="card-grid">
              {visible.map((card) => (
                <article className="card" key={card.id}>
                  <div className="card-image">
                    {card.image ? (
                      <img src={card.image} alt={`${card.name} trading card`} />
                    ) : (
                      <div className="placeholder">
                        <span>ポケモン</span>
                        <b>{card.name}</b>
                      </div>
                    )}
                    <button
                      className={`star ${card.priority ? "on" : ""}`}
                      onClick={() =>
                        updateCard(card.id, { priority: !card.priority })
                      }
                      aria-label="Toggle priority"
                    >
                      ★
                    </button>
                    {ownedCount(card) > 0 && (
                      <span className="owned">
                        <Icon name="check" size={13} /> Owned ×
                        {ownedCount(card)}
                      </span>
                    )}
                  </div>
                  <div className="card-info">
                    <div className="card-title">
                      <div>
                        <h3>{card.name}</h3>
                        <p>{card.japanese}</p>
                      </div>
                      <strong>
                        {card.price ? formatPrice(card.price) : "—"}
                      </strong>
                    </div>
                    <div className="meta">
                      <span>{card.set}</span>
                      <span>#{card.number}</span>
                    </div>
                    <div className="card-bottom">
                      <span>
                        {card.rarity} · {filter === "owned" ? "Owned" : "Wish"}{" "}
                        ×
                        {filter === "owned"
                          ? ownedCount(card)
                          : wishlistCount(card)}
                      </span>
                      {activeStorage(card) === "wishlist" && (
                        <button
                          className="collect-icon"
                          onClick={() => collectOne(card)}
                          title="Move one to collection"
                          aria-label={`Move one ${card.name} to collection`}
                        >
                          <Icon name="box" size={15} />
                        </button>
                      )}
                    </div>
                    <div className="personal-fields">
                      <div className="quantity-control">
                        <span>
                          {activeStorage(card) === "owned"
                            ? "Owned quantity"
                            : "Wishlist quantity"}
                        </span>
                        <div>
                          <button
                            onClick={() => changeActiveQuantity(card, -1)}
                            disabled={
                              (activeStorage(card) === "owned"
                                ? ownedCount(card)
                                : wishlistCount(card)) <= 1
                            }
                            aria-label={`Decrease ${card.name} quantity`}
                          >
                            −
                          </button>
                          <strong>
                            {activeStorage(card) === "owned"
                              ? ownedCount(card)
                              : wishlistCount(card)}
                          </strong>
                          <button
                            onClick={() => changeActiveQuantity(card, 1)}
                            aria-label={`Increase ${card.name} quantity`}
                          >
                            +
                          </button>
                          <button
                            className="quantity-trash"
                            onClick={() =>
                              removeFromStorage(card, activeStorage(card))
                            }
                            title={`Remove from ${activeStorage(card)}`}
                            aria-label={`Remove ${card.name} from ${activeStorage(card)}`}
                          >
                            <Icon name="trash" size={14} />
                          </button>
                        </div>
                      </div>
                      <label className="notes-field">
                        <span>Notes</span>
                        <input
                          value={card.notes || ""}
                          placeholder="Binder, seller, target price…"
                          onChange={(event) =>
                            updateCard(card.id, { notes: event.target.value })
                          }
                        />
                      </label>
                    </div>
                  </div>
                </article>
              ))}
              {visible.length === 0 && (
                <div className="empty">
                  <span>
                    <Icon name="search" size={28} />
                  </span>
                  <h3>No cards found</h3>
                  <p>Try another search or add a new card.</p>
                </div>
              )}
            </section>
            {/* eslint-enable @next/next/no-img-element */}
            <footer>
              <span>Made for your collection</span>
              <span>Prices are personal estimates · Last saved just now</span>
            </footer>
          </>
        ) : (
          <SetBrowser
            wishlistIds={new Set(cards.map((card) => card.id))}
            onAdd={addToWishlist}
          />
        )}
      </main>

      {showAdd && (
        <CatalogFinder
          existingIds={new Set(cards.map((card) => card.id))}
          onAdd={addToWishlist}
          onClose={() => setShowAdd(false)}
          formatPrice={formatPrice}
        />
      )}
      {showLogoutConfirm && (
        <div
          className="modal-backdrop"
          onMouseDown={() => !loggingOut && setShowLogoutConfirm(false)}
        >
          <section
            className="modal logout-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <span className="modal-icon">
              <Icon name="settings" />
            </span>
            <h2 id="logout-title">Sign out?</h2>
            <p>
              Your wishlist and collection will stay safely saved to your
              account.
            </p>
            <div className="logout-actions">
              <button
                className="logout-cancel"
                disabled={loggingOut}
                onClick={() => setShowLogoutConfirm(false)}
              >
                Stay signed in
              </button>
              <button
                className="logout-confirm"
                disabled={loggingOut}
                onClick={async () => {
                  setLoggingOut(true);
                  const response = await fetch("/api/auth", {
                    method: "DELETE",
                  });
                  setLoggingOut(false);
                  if (response.ok) {
                    setShowLogoutConfirm(false);
                    setCards([]);
                    setUser(null);
                  }
                }}
              >
                {loggingOut ? "Signing out…" : "Yes, sign out"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

/* eslint-disable @next/next/no-img-element -- TCGdex returns dynamic remote asset URLs */
function CatalogFinder({
  existingIds,
  onAdd,
  onClose,
  formatPrice,
}: {
  existingIds: Set<string>;
  onAdd: (card: Card) => void;
  onClose: () => void;
  formatPrice: (usd: number) => string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  useEffect(() => {
    if (query.trim().length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(
          `/api/catalog?q=${encodeURIComponent(query.trim())}&page=1`,
          { signal: controller.signal },
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Search failed.");
        setResults(data.cards || []);
        setPage(1);
        setHasMore(Boolean(data.pagination?.hasMore));
      } catch (caught) {
        if (!controller.signal.aborted)
          setError(caught instanceof Error ? caught.message : "Search failed.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 650);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);
  async function loadMore() {
    const nextPage = page + 1;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/catalog?q=${encodeURIComponent(query.trim())}&page=${nextPage}`,
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Search failed.");
      setResults((current) =>
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
  const hasQuery = query.trim().length >= 2;
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="modal catalog-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="close" onClick={onClose}>
          <Icon name="x" />
        </button>
        <span className="modal-icon">
          <Icon name="sparkle" />
        </span>
        <h2>Find a Japanese card</h2>
        <p>Card details from TCGdex · Near Mint prices from JustTCG</p>
        <label className="catalog-search">
          <Icon name="search" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && query.trim().length >= 2)
                router.push(`/search?q=${encodeURIComponent(query.trim())}`);
            }}
            placeholder="Try Espeon Terastal or Pikachu WCS"
            autoFocus
          />
        </label>
        <div className="catalog-results">
          {hasQuery && loading && (
            <div className="catalog-status">
              Searching the Japanese catalogue…
            </div>
          )}
          {hasQuery && error && (
            <div className="catalog-status error">{error}</div>
          )}
          {!hasQuery && (
            <div className="catalog-status">
              Enter at least 2 characters to search.
            </div>
          )}
          {hasQuery && !loading && !error && results.length === 0 && (
            <div className="catalog-status">
              No matching Japanese cards found.
            </div>
          )}
          {hasQuery &&
            !loading &&
            results.map((card) => {
              const added = existingIds.has(card.id);
              return (
                <article className="catalog-result" key={card.id}>
                  <div className="catalog-thumb">
                    {card.image && <img src={card.image} alt="" />}
                  </div>
                  <div>
                    <h3>{card.japanese}</h3>
                    <p>
                      {card.set} · #{card.number}
                    </p>
                    <span>{card.rarity}</span>
                  </div>
                  <div className="catalog-price">
                    <strong>
                      {card.price ? formatPrice(card.price) : "—"}
                    </strong>
                    <small>{card.priceSource || "No price match"}</small>
                    <button onClick={() => onAdd(card)}>
                      {added ? (
                        <>
                          <Icon name="plus" size={14} /> Add another
                        </>
                      ) : (
                        <>
                          <Icon name="plus" size={14} /> Add
                        </>
                      )}
                    </button>
                  </div>
                </article>
              );
            })}
          {hasQuery && !loading && hasMore && (
            <button className="load-more" onClick={loadMore}>
              Load more cards
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
/* eslint-enable @next/next/no-img-element */

/* eslint-disable @next/next/no-img-element -- TCGdex returns dynamic Japanese card and set assets */
function SetBrowser({
  wishlistIds,
  onAdd,
}: {
  wishlistIds: Set<string>;
  onAdd: (card: Card) => void;
}) {
  const [sets, setSets] = useState<JapaneseSet[]>([]);
  const [selected, setSelected] = useState<JapaneseSetDetail | null>(null);
  const [setQuery, setSetQuery] = useState("");
  const [cardQuery, setCardQuery] = useState("");
  const [rarityFilter, setRarityFilter] = useState("all");
  const [loadingSets, setLoadingSets] = useState(true);
  const [loadingCards, setLoadingCards] = useState(false);
  const [mobileSetListOpen, setMobileSetListOpen] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/sets")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setSets(data.sets || []);
        if (data.sets?.[0]) loadSet(data.sets[0].id);
      })
      .catch((caught) =>
        setError(
          caught instanceof Error ? caught.message : "Could not load sets.",
        ),
      )
      .finally(() => setLoadingSets(false));
  }, []);

  async function loadSet(id: string, page = 1) {
    setMobileSetListOpen(false);
    setLoadingCards(true);
    setError("");
    setCardQuery("");
    setRarityFilter("all");
    try {
      const response = await fetch(
        `/api/sets?id=${encodeURIComponent(id)}&page=${page}`,
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSelected(data.set);
      setPagination(
        data.pagination || {
          page: 1,
          pages: 1,
          total: data.set.cards?.length || 0,
        },
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not load this set.",
      );
    } finally {
      setLoadingCards(false);
    }
  }

  const visibleSets = sets.filter((set) =>
    `${set.name} ${set.japaneseName} ${set.englishName} ${set.id}`
      .toLowerCase()
      .includes(setQuery.toLowerCase()),
  );
  const rarities = Array.from(
    new Map(
      (selected?.cards || [])
        .filter((card) => card.rarityCode)
        .map((card) => [card.rarityCode!, card.rarity || card.rarityCode!]),
    ),
  );
  const visibleCards = (selected?.cards || []).filter((card) => {
    const matchesSearch =
      `${card.name} ${card.japaneseName} ${card.englishName} ${card.localId}`
        .toLowerCase()
        .includes(cardQuery.toLowerCase());
    return (
      matchesSearch &&
      (rarityFilter === "all" || card.rarityCode === rarityFilter)
    );
  });

  return (
    <section className="set-browser">
      <div className="set-browser-head">
        <div>
          <p>JAPANESE CARD CATALOGUE</p>
          <h2>Browse every set</h2>
          <span>
            {sets.length
              ? `${sets.length} Japanese sets from PokeWallet`
              : "Loading the complete set index…"}
          </span>
        </div>
        <label className="set-search">
          <Icon name="search" />
          <input
            value={setQuery}
            onChange={(event) => setSetQuery(event.target.value)}
            placeholder="Find a set…"
          />
        </label>
      </div>
      <GlobalCardSearch wishlistIds={wishlistIds} onAdd={onAdd} />
      <button
        className="mobile-set-toggle"
        onClick={() => setMobileSetListOpen((current) => !current)}
        aria-expanded={mobileSetListOpen}
        aria-controls="set-catalogue-list"
      >
        <span>
          <small>SELECTED SET</small>
          <b>{selected?.name || "Choose a Japanese set"}</b>
        </span>
        <Icon name={mobileSetListOpen ? "x" : "menu"} size={18} />
      </button>
      <div
        className={`set-layout ${mobileSetListOpen ? "set-list-open" : ""}`}
      >
        <aside className="set-list" id="set-catalogue-list">
          {loadingSets && <div className="set-list-status">Loading sets…</div>}
          {visibleSets.map((set) => (
            <button
              key={set.id}
              className={selected?.id === set.id ? "active" : ""}
              onClick={() => loadSet(set.id)}
            >
              {set.symbol ? (
                <img src={`${set.symbol}.webp`} alt="" />
              ) : (
                <span className="set-dot" />
              )}
              <span>
                <b>{set.name}</b>
                <small>
                  {set.source === "pokewallet"
                    ? `${set.cardCount.total} cards · PokeWallet`
                    : set.source === "justtcg"
                      ? "NEW · JustTCG early access"
                      : `${set.cardCount.total} cards · ${set.id}`}
                </small>
              </span>
            </button>
          ))}
          {!loadingSets && visibleSets.length === 0 && (
            <div className="set-list-status">No matching sets.</div>
          )}
        </aside>
        <div className="set-content">
          {error && <div className="set-error">{error}</div>}
          {loadingCards && (
            <div className="set-loading">
              <span className="brand-mark">
                <span />
              </span>
              <p>Loading Japanese artwork and English names…</p>
            </div>
          )}
          {!loadingCards && selected && (
            <>
              <header className="selected-set-head">
                <div className="set-identity">
                  {selected.logo && (
                    <img src={`${selected.logo}.webp`} alt="" />
                  )}
                  <div>
                    <span>{selected.serie?.name || "Japanese Pokémon"}</span>
                    <h3>{selected.name}</h3>
                    <p>
                      {pagination.total} catalogue items
                      {selected.releaseDate
                        ? ` · Released ${selected.releaseDate}`
                        : ""}
                    </p>
                  </div>
                </div>
                <label>
                  <Icon name="search" />
                  <input
                    value={cardQuery}
                    onChange={(event) => setCardQuery(event.target.value)}
                    placeholder="Filter this page…"
                  />
                </label>
                <label className="rarity-select">
                  <span>Rarity</span>
                  <select
                    value={rarityFilter}
                    onChange={(event) => setRarityFilter(event.target.value)}
                  >
                    <option value="all">All rarities</option>
                    {rarities.map(([code, label]) => (
                      <option key={code} value={code}>
                        {code} · {label}
                      </option>
                    ))}
                  </select>
                </label>
              </header>
              <div className="set-card-grid">
                {visibleCards.map((card) => {
                  const id = card.id.includes(":")
                    ? card.id
                    : `tcgdex:${card.id}`;
                  const added = wishlistIds.has(id);
                  const englishName =
                    card.englishName || "English name unavailable";
                  const japaneseName =
                    card.japaneseName ||
                    (selected.source === "justtcg" ||
                    selected.source === "pokewallet"
                      ? "日本語名はTCGdexの登録待ち"
                      : card.name);
                  return (
                    <article key={card.id}>
                      <div className="set-card-image">
                        {card.image || card.fallbackImage ? (
                          <img
                            src={card.image || card.fallbackImage}
                            alt={`${englishName} Japanese card`}
                            onError={(event) => {
                              if (
                                !card.fallbackImage ||
                                event.currentTarget.src.endsWith(
                                  card.fallbackImage,
                                )
                              )
                                return;
                              event.currentTarget.onerror = null;
                              event.currentTarget.src = card.fallbackImage;
                            }}
                          />
                        ) : (
                          <div className="mini-placeholder">
                            <span>IMAGE UNAVAILABLE</span>
                            <b>#{card.localId}</b>
                          </div>
                        )}
                      </div>
                      <div>
                        <span>#{card.localId}</span>
                        {card.rarityCode && (
                          <span className="rarity-badge" title={card.rarity}>
                            {card.rarityCode}
                          </span>
                        )}
                        <h4>{englishName}</h4>
                        <p className="japanese-card-name" lang="ja">
                          {japaneseName}
                        </p>
                        <button
                          onClick={() =>
                            onAdd({
                              id,
                              name: englishName,
                              japanese: japaneseName,
                              set: selected.name,
                              setId: selected.id,
                              setTotal: selected.cardCount.official,
                              number: `${card.localId}/${selected.cardCount.official}`,
                              rarity: card.rarity || "Japanese card",
                              price: card.price || 0,
                              image: card.image || card.fallbackImage || "",
                              owned: false,
                              priority: false,
                              quantity: 1,
                              condition: "NM",
                              purchasePrice: 0,
                              notes: "",
                              addedAt: new Date().toISOString(),
                            })
                          }
                        >
                          {added ? (
                            <>
                              <Icon name="plus" size={13} /> Add another
                            </>
                          ) : (
                            <>
                              <Icon name="plus" size={13} /> Wishlist
                            </>
                          )}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
              {visibleCards.length === 0 && (
                <div className="catalog-status">
                  No cards match this filter.
                </div>
              )}
              <nav className="set-pagination" aria-label="Set card pages">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => loadSet(selected.id, pagination.page - 1)}
                >
                  Previous
                </button>
                <span>
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => loadSet(selected.id, pagination.page + 1)}
                >
                  Next
                </button>
              </nav>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function GlobalCardSearch({
  wishlistIds,
  onAdd,
}: {
  wishlistIds: Set<string>;
  onAdd: (card: Card) => void;
}) {
  const router = useRouter();
  const { formatPrice } = useCurrency();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [rarity, setRarity] = useState("all");

  useEffect(() => {
    if (query.trim().length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(
          `/api/catalog?q=${encodeURIComponent(query.trim())}&page=1`,
          { signal: controller.signal },
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Search failed.");
        setResults(data.cards || []);
        setPage(1);
        setHasMore(Boolean(data.pagination?.hasMore));
      } catch (caught) {
        if (!controller.signal.aborted)
          setError(caught instanceof Error ? caught.message : "Search failed.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 650);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  async function loadMore() {
    const nextPage = page + 1;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/catalog?q=${encodeURIComponent(query.trim())}&page=${nextPage}`,
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Search failed.");
      setResults((current) =>
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

  const active = query.trim().length >= 2;
  const rarities = [...new Set(results.map((card) => card.rarity))].sort();
  const visibleResults =
    rarity === "all"
      ? results
      : results.filter((card) => card.rarity === rarity);
  return (
    <section className={`global-search ${active ? "active" : ""}`}>
      <label>
        <Icon name="search" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && query.trim().length >= 2)
              router.push(`/search?q=${encodeURIComponent(query.trim())}`);
          }}
          placeholder="Card + set, e.g. Espeon Terastal…"
        />
        {active && (
          <button
            onClick={() => {
              setQuery("");
              setResults([]);
            }}
            aria-label="Clear card search"
          >
            <Icon name="x" size={16} />
          </button>
        )}
      </label>
      {active && results.length > 0 && (
        <label className="global-rarity-filter">
          <span>Rarity</span>
          <select
            value={rarity}
            onChange={(event) => setRarity(event.target.value)}
          >
            <option value="all">All rarities</option>
            {rarities.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
      )}
      {active && (
        <div className="global-results">
          {loading && (
            <div className="catalog-status">Searching every set…</div>
          )}
          {error && <div className="catalog-status error">{error}</div>}
          {!loading && !error && results.length === 0 && (
            <div className="catalog-status">No Japanese cards found.</div>
          )}
          {!loading &&
            visibleResults.map((card) => {
              const added = wishlistIds.has(card.id);
              return (
                <article key={card.id}>
                  <div className="global-result-image">
                    {card.image ? (
                      <img src={card.image} alt="" />
                    ) : (
                      <span>NO IMAGE</span>
                    )}
                  </div>
                  <div className="global-result-copy">
                    <span>{card.rarity}</span>
                    <h3>{card.name}</h3>
                    <p lang="ja">{card.japanese}</p>
                    <small>
                      {card.set} · #{card.number}
                    </small>
                  </div>
                  <div className="global-result-action">
                    <strong>
                      {card.price ? formatPrice(card.price) : "—"}
                    </strong>
                    <button onClick={() => onAdd(card)}>
                      {added ? (
                        <>
                          <Icon name="plus" size={13} /> Add another
                        </>
                      ) : (
                        <>
                          <Icon name="plus" size={13} /> Wishlist
                        </>
                      )}
                    </button>
                  </div>
                </article>
              );
            })}
          {!loading && hasMore && (
            <button className="load-more global-load-more" onClick={loadMore}>
              Load more cards
            </button>
          )}
        </div>
      )}
    </section>
  );
}
/* eslint-enable @next/next/no-img-element */

function AuthScreen({
  onSuccess,
}: {
  onSuccess: (user: { name: string; email: string }, cards: Card[]) => void;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const message = new URLSearchParams(window.location.search).get(
      "auth_error",
    );
    if (message) {
      const timer = window.setTimeout(() => setError(message), 0);
      window.history.replaceState({}, "", window.location.pathname);
      return () => window.clearTimeout(timer);
    }
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, mode }),
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok || !result.user)
      setError(result.error || "Confirm your account, then sign in.");
    else onSuccess(result.user, result.cards || []);
  }
  return (
    <main className="auth-page">
      <section className="auth-intro">
        <div className="auth-brand">
          <span className="brand-mark">
            <span />
          </span>
          <b>PokeCell</b>
        </div>
        <div>
          <span className="eyebrow">YOUR PRIVATE COLLECTION</span>
          <h1>
            A quiet home for the cards <em>you love.</em>
          </h1>
          <p>
            Keep a thoughtful wishlist of Japanese Pokémon cards, track what you
            own, and let your collection grow at its own pace.
          </p>
        </div>
        <small>私のポケモンカードコレクション</small>
      </section>
      <section className="auth-panel">
        <div className="auth-box">
          <span className="auth-icon">
            <Icon name="sparkle" />
          </span>
          <h2>{mode === "login" ? "Welcome back" : "Start your collection"}</h2>
          <p>
            {mode === "login"
              ? "Sign in to open your personal wishlist."
              : "Create a private account to save your cards."}
          </p>
          <a className="google-auth-button" href="/auth/google">
            <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden>
              <path fill="#4285F4" d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.482h4.844a4.14 4.14 0 0 1-1.797 2.715v2.259h2.909c1.702-1.567 2.684-3.875 2.684-6.615Z" />
              <path fill="#34A853" d="M9 18c2.43 0 4.468-.806 5.956-2.18l-2.909-2.259c-.806.54-1.835.859-3.047.859-2.344 0-4.328-1.585-5.037-3.714H.956v2.332A9 9 0 0 0 9 18Z" />
              <path fill="#FBBC05" d="M3.963 10.706A5.41 5.41 0 0 1 3.682 9c0-.592.102-1.167.281-1.706V4.962H.956A9 9 0 0 0 0 9c0 1.452.347 2.827.956 4.038l3.007-2.332Z" />
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.507.454 3.441 1.346l2.581-2.581C13.464.892 11.426 0 9 0A9 9 0 0 0 .956 4.962l3.007 2.332C4.672 5.165 6.656 3.58 9 3.58Z" />
            </svg>
            Continue with Google
          </a>
          <div className="auth-divider"><span>or use email</span></div>
          <form onSubmit={submit}>
            {mode === "register" && (
              <label>
                Your name
                <input name="name" required placeholder="Darian" />
              </label>
            )}
            <label>
              Email address
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                minLength={8}
                required
                placeholder="At least 8 characters"
              />
            </label>
            {error && <div className="auth-error">{error}</div>}
            <button disabled={busy}>
              {busy
                ? "One moment…"
                : mode === "login"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>
          <div className="auth-switch">
            {mode === "login" ? "New to PokeCell?" : "Already have an account?"}{" "}
            <button
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError("");
              }}
            >
              {mode === "login" ? "Create an account" : "Sign in"}
            </button>
          </div>
          <div className="privacy-note">
            <Icon name="check" size={15} />
            <span>
              <b>Private by design</b>Your collection is only visible to you.
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
