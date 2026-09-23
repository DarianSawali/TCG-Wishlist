"use client";

import { useEffect, useState } from "react";

export type Currency = "USD" | "CAD" | "JPY";
type Rates = Record<Currency, number>;

const fallbackRates: Rates = { USD: 1, CAD: 1, JPY: 1 };

export function useCurrency() {
  const [currency, setCurrencyState] = useState<Currency>("USD");
  const [rates, setRates] = useState<Rates>(fallbackRates);
  const [ratesReady, setRatesReady] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("pokecell-currency");
    const timer = window.setTimeout(() => {
      if (saved === "USD" || saved === "CAD" || saved === "JPY")
        setCurrencyState(saved);
    }, 0);
    fetch("/api/exchange-rates")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data;
      })
      .then((data) => {
        setRates(data.rates);
        setRatesReady(true);
      })
      .catch(() => undefined);
    return () => window.clearTimeout(timer);
  }, []);

  function setCurrency(next: Currency) {
    setCurrencyState(next);
    window.localStorage.setItem("pokecell-currency", next);
  }

  function formatPrice(usd: number, options?: { whole?: boolean }) {
    if (currency !== "USD" && !ratesReady) return "—";
    const converted = usd * rates[currency];
    return new Intl.NumberFormat(currency === "JPY" ? "ja-JP" : "en-CA", {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "JPY" || options?.whole ? 0 : 2,
      minimumFractionDigits: currency === "JPY" || options?.whole ? 0 : 2,
    }).format(converted);
  }

  return { currency, setCurrency, formatPrice };
}
