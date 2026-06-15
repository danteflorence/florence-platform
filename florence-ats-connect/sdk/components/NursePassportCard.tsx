// Embeddable NursePassport widget — the first FlorenceRN Component SDK widget.
// A React component that renders a PERMISSIONED Passport view fetched from the
// Platform API via the typed SDK (sdk/florencern.ts), so partners + our own apps
// drop it in without touching a database. The `client` is injectable for embedding,
// SSR, and testing. Render-layer defense-in-depth (passportCardModel) guarantees
// visa/financing are never shown even on a non-redacted payload. (P1: workspace-
// internal; published as @florencern/components in a later phase.)
import { useEffect, useState } from "react"
import { FlorenceRN, type PassportAudience } from "../florencern"
import { passportCardModel, type PassportRow } from "./passportCardModel"

export interface NursePassportCardProps {
  candidateId: string
  /** Which permissioned view to request (employer | internal | candidate). */
  view?: PassportAudience
  /** Inject a configured SDK client (base URL / token). Defaults to same-origin. */
  client?: FlorenceRN
  /** Pre-loaded passport (skips the fetch — for SSR / tests / Storybook). */
  initialPassport?: Record<string, unknown>
}

export function NursePassportCard({ candidateId, view = "employer", client, initialPassport }: NursePassportCardProps) {
  const [rows, setRows] = useState<PassportRow[] | null>(
    initialPassport ? passportCardModel(initialPassport).rows : null,
  )
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initialPassport) return
    let live = true
    const c = client ?? new FlorenceRN()
    c.passport(candidateId, view)
      .then((p) => { if (live) setRows(passportCardModel(((p as { passport?: Record<string, unknown> }).passport ?? p) as Record<string, unknown>).rows) })
      .catch((e) => { if (live) setError(String((e as Error)?.message ?? e)) })
    return () => { live = false }
  }, [candidateId, view, client, initialPassport])

  if (error) return <div className="frn-passport-card frn-passport-card--error">Unable to load passport.</div>
  if (!rows) return <div className="frn-passport-card frn-passport-card--loading">Loading…</div>
  return (
    <div className="frn-passport-card" data-view={view}>
      <div className="frn-passport-card__title">Nurse Passport</div>
      <dl className="frn-passport-card__fields">
        {rows.map((r) => (
          <div key={r.label} className="frn-passport-card__row">
            <dt>{r.label}</dt>
            <dd>{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export default NursePassportCard
