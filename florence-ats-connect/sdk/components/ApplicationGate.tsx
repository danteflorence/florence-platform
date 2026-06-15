// Embeddable ApplicationGate widget — shows a candidate what's left before FlorenceRN
// can SUBMIT an application (interest is always free). Runs the eligibility check via
// the SDK; renders the missing gates + the subject-to clauses. Never shows visa status
// itself — only that the "Visa approved" gate is or isn't met.
import { useEffect, useState } from "react"
import { FlorenceRN } from "../florencern"
import { applicationGateModel, type ApplicationGateView } from "./widgetModels"

export interface ApplicationGateProps {
  candidateId: string
  jobId: string
  client?: FlorenceRN
  initialGate?: Record<string, unknown>
}

export function ApplicationGate({ candidateId, jobId, client, initialGate }: ApplicationGateProps) {
  const [view, setView] = useState<ApplicationGateView | null>(initialGate ? applicationGateModel(initialGate) : null)
  useEffect(() => {
    if (initialGate) return
    let live = true
    ;(client ?? new FlorenceRN()).eligibilityCheck(candidateId, jobId)
      .then((g) => { if (live) setView(applicationGateModel(g as unknown as Record<string, unknown>)) })
      .catch(() => { if (live) setView(null) })
    return () => { live = false }
  }, [candidateId, jobId, client, initialGate])
  if (!view) return <div className="frn-app-gate frn-app-gate--loading">Checking eligibility…</div>
  const ready = view.action === "apply_with_packet"
  return (
    <div className="frn-app-gate" data-action={view.action}>
      <div className="frn-app-gate__status">{ready ? "Ready to submit with a FlorenceRN packet" : "Interest recorded — not yet submittable"}</div>
      {!ready && view.missing.length > 0 && (
        <ul className="frn-app-gate__missing">{view.missing.map((m) => <li key={m.key}>{m.label}</li>)}</ul>
      )}
      {ready && view.subjectTo.length > 0 && (
        <p className="frn-app-gate__subject">Subject to: {view.subjectTo.join(", ")}</p>
      )}
    </div>
  )
}

export default ApplicationGate
