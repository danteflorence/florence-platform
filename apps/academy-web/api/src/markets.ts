// ───────────────────────────────────────────────────────────────────────────
// markets.ts - which currency, payment provider, and payment methods a
// candidate sees, decided by their country. The whole point: a Manila
// candidate pays in pesos with GCash, a Nairobi candidate in shillings with
// M-Pesa, and neither hits a USD card wall - while a US/default candidate
// gets Stripe cards exactly as before.
//
// Pure data + functions; provider selection happens in payments.ts.
//
// FX RATES ARE OPERATOR-OWNED CONSTANTS, not a live feed: prices must be
// stable and predictable for learners (and for support). Rounded generously
// to clean local figures. Review quarterly or when a currency moves >10%.
// Set 2026-07 from public mid-market rates.
// ───────────────────────────────────────────────────────────────────────────

export type ProviderName = "stripe" | "paymongo" | "paystack" | "mock";

export interface Market {
  code: "PH" | "KE" | "GH" | "NG" | "INTL";
  /** ISO 4217, lowercase (Stripe style). */
  currency: string;
  symbol: string;
  provider: ProviderName;
  /** What the learner sees as available ways to pay (display only). */
  methods: string[];
  /** Local minor-units per 1 USD cent (all four currencies use 1/100 minor
   *  units, so this equals the USD exchange rate). */
  perUsdCent: number;
  /** Round local MAJOR-unit prices to this step for clean price tags. */
  roundToMajor: number;
}

export const MARKETS: Record<Market["code"], Market> = {
  PH: {
    code: "PH", currency: "php", symbol: "₱", provider: "paymongo",
    methods: ["GCash", "Maya", "Card"],
    perUsdCent: 57, roundToMajor: 10, // ₱57/USD → price steps of ₱10
  },
  KE: {
    code: "KE", currency: "kes", symbol: "KSh", provider: "paystack",
    methods: ["M-Pesa", "Card"],
    perUsdCent: 129, roundToMajor: 10,
  },
  GH: {
    code: "GH", currency: "ghs", symbol: "GH₵", provider: "paystack",
    methods: ["MTN MoMo", "Card"],
    perUsdCent: 15.5, roundToMajor: 1,
  },
  NG: {
    code: "NG", currency: "ngn", symbol: "₦", provider: "paystack",
    methods: ["Bank transfer", "Card", "USSD"],
    perUsdCent: 1540, roundToMajor: 100,
  },
  INTL: {
    code: "INTL", currency: "usd", symbol: "$", provider: "stripe",
    methods: ["Card"],
    perUsdCent: 1, roundToMajor: 1,
  },
};

// Country → market. Accepts ISO-3166 alpha-2 or the free-text names the
// signup form collects (case/whitespace-insensitive). Unknown → INTL (USD
// cards) - the safe default, never a blocked signup.
const COUNTRY_TO_MARKET: Record<string, Market["code"]> = {
  ph: "PH", philippines: "PH", "the philippines": "PH", pilipinas: "PH",
  ke: "KE", kenya: "KE",
  gh: "GH", ghana: "GH",
  ng: "NG", nigeria: "NG",
};

export function marketForCountry(country: string | undefined | null): Market {
  const key = (country ?? "").trim().toLowerCase();
  return MARKETS[COUNTRY_TO_MARKET[key] ?? "INTL"];
}

/** Convert a USD-cent amount into the market's minor units, rounded to a
 *  clean local price tag (e.g. $75 → ₱4,280 → ₱4,280; KSh 9,680). Never
 *  rounds below one major unit. */
export function localAmountCents(market: Market, usdCents: number): number {
  if (market.code === "INTL") return usdCents;
  const rawMinor = usdCents * market.perUsdCent;
  const stepMinor = market.roundToMajor * 100;
  const rounded = Math.round(rawMinor / stepMinor) * stepMinor;
  return Math.max(stepMinor, rounded);
}

/** "₱4,280" - display string from minor units. */
export function formatLocal(market: Market, amountCents: number): string {
  const major = amountCents / 100;
  const s = Number.isInteger(major)
    ? major.toLocaleString("en-US")
    : major.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${market.symbol}${s}`;
}
