import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { completeMockCheckout } from "../lib/academyAuth";

/**
 * Mock hosted-checkout page - stands in for the payment provider's hosted page
 * while no live processor is configured. No card is collected and no money moves;
 * "Pay" calls the dev-only mock-complete endpoint. Wiring Stripe replaces this
 * screen entirely (the API returns Stripe's URL instead of this route).
 */
export default function CheckoutMock() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const pid = params.get("pid") ?? "";
  const amtCents = Number(params.get("amt") ?? 10000);
  const amountLabel = `$${(amtCents / 100).toFixed(2)}`;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    if (!pid || busy) return;
    setBusy(true);
    setError(null);
    const ok = await completeMockCheckout(pid);
    if (ok) navigate("/academy/account?access=success");
    else {
      setError("Could not complete the test payment.");
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-florence-ink px-5">
      <div className="w-full max-w-md rounded-2xl border border-florence-line bg-white p-6 shadow-card-lg">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-florence-slate">Test mode, no real charge</p>
        <h1 className="mt-1 font-serif text-2xl font-semibold">Florence Academy</h1>
        <p className="mt-0.5 text-sm text-florence-slate">Global Live NCLEX Access</p>

        <div className="mt-5 flex items-baseline justify-between border-y border-florence-line py-4">
          <span className="font-medium text-florence-ink">Student price</span>
          <span className="text-2xl font-semibold tabular-nums text-florence-ink">{amountLabel}</span>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-florence-slate">
          This mock screen stands in for the hosted payment page. No card is collected
          and no money moves. Connecting a live processor (Stripe Checkout) replaces this
          screen.
        </p>

        {!pid && <p className="mt-3 text-sm font-medium text-vital-danger">Missing payment reference.</p>}
        {error && (
          <p className="mt-3 rounded-lg bg-vital-danger/10 px-3 py-2 text-sm text-vital-danger">{error}</p>
        )}

        <button
          onClick={pay}
          disabled={!pid || busy}
          className="mt-5 w-full rounded-xl bg-florence-indigo px-5 py-3 text-sm font-semibold text-white shadow-card transition-colors hover:bg-florence-indigo-dark disabled:opacity-50"
        >
          {busy ? "Processing..." : `Pay ${amountLabel} (test)`}
        </button>
        <button
          onClick={() => navigate("/academy/account?access=cancelled")}
          className="mt-2 w-full rounded-xl border border-florence-line bg-white px-5 py-2.5 text-sm font-medium text-florence-slate hover:bg-florence-mist"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
