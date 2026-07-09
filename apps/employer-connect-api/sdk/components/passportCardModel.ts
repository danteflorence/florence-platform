// Pure view-model for the embeddable NursePassport widget. The widget renders a
// permissioned Passport view fetched from the Platform API — but as DEFENSE IN DEPTH
// it ALSO refuses, at the render layer, to ever display visa/immigration/nationality/
// financing/SSN even if a caller hands it a non-redacted object (Title VII / IRCA).
// Pure + dependency-free so it is unit-testable in Node without a DOM.

export const NEVER_RENDER = [
  "visastatus", "visa", "nationality", "countryofeducation", "currentcountry",
  "financing", "billing", "ssn", "dateofbirth", "dob", "arrivalstatus",
] as const

export interface PassportRow {
  label: string
  value: string
}

const LABELS: Record<string, string> = {
  name: "Name",
  readinessBand: "Readiness",
  readiness: "Readiness",
  nclexStatus: "NCLEX",
  nclex: "NCLEX",
  licenseStatus: "License",
  licensure: "License",
  specialtyExperience: "Specialty",
  yearsExperience: "Experience (yrs)",
  targetStates: "Target states",
  expectedStartWindow: "Start window",
}

function isSensitive(key: string): boolean {
  return (NEVER_RENDER as readonly string[]).includes(key.toLowerCase())
}

function fmt(v: unknown): string {
  if (v == null) return ""
  if (Array.isArray(v)) return v.join(", ")
  if (typeof v === "object") {
    const o = v as Record<string, unknown>
    return String(o.band ?? o.status ?? o.state ?? JSON.stringify(o))
  }
  return String(v)
}

/** Project a (already-redacted) passport object into ordered display rows, dropping
 *  any sensitive key as a last-line-of-defense. Returns the dropped keys for audit. */
export function passportCardModel(passport: Record<string, unknown>): { rows: PassportRow[]; redactedKeys: string[] } {
  const rows: PassportRow[] = []
  const redactedKeys: string[] = []
  for (const [k, v] of Object.entries(passport ?? {})) {
    if (k === "nurseId" || k === "view" || k === "withheld" || k === "email" || k === "phone") continue
    if (isSensitive(k)) { redactedKeys.push(k); continue }
    if (v == null || v === "") continue
    rows.push({ label: LABELS[k] ?? k, value: fmt(v) })
  }
  return { rows, redactedKeys }
}
