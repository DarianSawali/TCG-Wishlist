import type { Currency } from "@/lib/use-currency";

export function CurrencyControl({
  currency,
  onChange,
}: {
  currency: Currency;
  onChange: (currency: Currency) => void;
}) {
  return (
    <div className="currency-control" aria-label="Display currency">
      {(["USD", "CAD", "JPY"] as const).map((item) => (
        <button
          type="button"
          key={item}
          className={currency === item ? "active" : ""}
          onClick={() => onChange(item)}
          aria-pressed={currency === item}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
