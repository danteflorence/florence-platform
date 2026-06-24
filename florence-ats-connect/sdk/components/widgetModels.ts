// Pure view-models for the embeddable Component SDK widgets (JobTiles, ApplicationGate,
// PricingQuote). Pure + dependency-free so they unit-test in Node without a DOM, and so
// every widget shares the same render-layer guarantees. Like passportCardModel, these
// NEVER surface visa/financing even if a payload carries them (defense in depth).
import { NEVER_RENDER } from "./passportCardModel"

export interface JobTile { id: string; title: string; employer?: string; location?: string; cta: string }

/** Map opportunities from GET /v1/opportunities to display tiles. */
export function jobTilesModel(opps: Array<Record<string, unknown>>): JobTile[] {
  return (opps ?? []).map((o) => ({
    id: String(o.id ?? ""),
    title: String(o.title ?? "Registered Nurse"),
    employer: o.employerName ? String(o.employerName) : undefined,
    location: [o.city, o.state].filter(Boolean).join(", ") || undefined,
    // CTA comes from the gate-aware opportunity state; default to the safe signal.
    cta: typeof o.cta === "string" ? o.cta : "express_interest",
  }))
}

const GATE_LABEL: Record<string, string> = {
  employer_share_consent: "Employer-share consent",
  visa_approved: "Visa approved",
  license_verified_active: "License verified",
  employer_packet_qa_approved: "Packet QA approved",
  job_open: "Job open",
  channel_authorized: "Employer/channel authorized",
  documents_complete: "Documents complete",
}

export interface ApplicationGateView {
  status: string
  action: string
  missing: { key: string; label: string }[]
  subjectTo: string[]
  subjectToMessage: string
}

/** Map an eligibility-check response to a candidate-facing gate view. The widget shows
 *  what's left before FlorenceRN can SUBMIT — interest stays free either way. */
export function applicationGateModel(gate: Record<string, unknown>): ApplicationGateView {
  const missingKeys = Array.isArray(gate.missing) ? (gate.missing as unknown[]).filter((x): x is string => typeof x === "string") : []
  return {
    status: String(gate.applicationGateStatus ?? gate.status ?? "not_ready"),
    action: String(gate.allowedAction ?? "express_interest"),
    missing: missingKeys.map((k) => ({ key: k, label: GATE_LABEL[k] ?? k })),
    subjectTo: Array.isArray(gate.subjectTo) ? (gate.subjectTo as unknown[]).filter((x): x is string => typeof x === "string") : [],
    subjectToMessage: typeof gate.subjectToMessage === "string" ? gate.subjectToMessage : "",
  }
}

export interface PricingRow { label: string; value: string }

/** Map a /v1/pricing/quote response to display rows. FICA is ALWAYS framed as customer
 *  effective-cost, never FlorenceRN revenue (the note is carried through verbatim). */
export function pricingQuoteModel(q: Record<string, unknown>): { rows: PricingRow[]; note: string } {
  const usd = (v: unknown) => (typeof v === "number" ? `$${v.toLocaleString()}` : "—")
  return {
    rows: [
      { label: "Per-RN / month fee", value: usd(q.monthlyFeePerRnUsd) },
      { label: "Customer effective cost / RN / month", value: usd(q.effectiveCostPerRnMonthUsd) },
      { label: "Channel", value: String(q.channel ?? "direct") },
    ],
    note: String(q.note ?? "FICA offset is customer effective-cost, never FlorenceRN revenue."),
  }
}

/** Shared guard re-export so every widget can assert it never renders a sensitive key. */
export { NEVER_RENDER }
