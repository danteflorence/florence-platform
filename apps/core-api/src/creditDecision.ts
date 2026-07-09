// Fair-lending credit-decision package. Projects a (consented) lender Passport view
// down to ONLY the fields permissible to inform a credit decision. Two hard guards:
//   1. PROHIBITED_BASIS (national-origin / immigration proxies) are dropped ALWAYS —
//      ECOA / Reg B. Even an operator env override cannot re-add them.
//   2. CREDIT_DECISION_FIELDS is an explicit allowlist (default-deny); the consent's
//      allowed_fields can narrow it further (the field-minimization the consent gate
//      stores but the generic view never enforced).
// Pure + dependency-free. The actual field-eligibility set is COUNSEL-OWNED — this is
// the safe default; counsel may clear additions via CREDIT_DECISION_EXTRA_FIELDS (which
// still cannot include a prohibited-basis field).

// National-origin / immigration proxies — never an input to a credit decision.
export const PROHIBITED_BASIS = new Set<string>([
  "visa", "nationality", "countryOfEducation", "currentCountry", "arrivalStatus",
]);

// Default-deny allowlist of underwriting-permissible signals (folded-Passport keys).
// NOTE: visa is deliberately absent (belt-and-suspenders with PROHIBITED_BASIS).
export const CREDIT_DECISION_FIELDS = new Set<string>([
  "nurseId", "name", "readiness", "nclex", "licensure", "billing", "placement", "retention", "funnelStage",
]);

/** Counsel-cleared additions via env — but a prohibited-basis field can NEVER be added. */
function extraAllowed(): string[] {
  return (process.env.CREDIT_DECISION_EXTRA_FIELDS ?? "")
    .split(",").map((s) => s.trim()).filter(Boolean)
    .filter((f) => !PROHIBITED_BASIS.has(f));
}

export interface CreditPackageResult {
  fields: Record<string, unknown>;
  /** Prohibited-basis fields dropped (ECOA/Reg B) — surfaced for the audit record. */
  droppedProhibited: string[];
  /** Fields dropped because the candidate's consent did not allow them. */
  droppedByConsent: string[];
}

/** Build the credit-decision package from a lender Passport projection + the consent's
 *  allowed_fields (optional; when present, intersects the allowlist). Fail-closed. */
export function creditDecisionPackage(projection: Record<string, unknown>, allowedFields?: string[]): CreditPackageResult {
  const allow = new Set<string>([...CREDIT_DECISION_FIELDS, ...extraAllowed()]);
  const consentSet = allowedFields && allowedFields.length ? new Set(allowedFields) : null;
  const fields: Record<string, unknown> = {};
  const droppedProhibited: string[] = [];
  const droppedByConsent: string[] = [];
  for (const [k, v] of Object.entries(projection ?? {})) {
    if (PROHIBITED_BASIS.has(k)) { droppedProhibited.push(k); continue; } // hard exclude (ECOA/Reg B)
    if (!allow.has(k)) continue; // not in the credit-decision allowlist (default-deny)
    if (consentSet && !consentSet.has(k)) { droppedByConsent.push(k); continue; } // consent narrowed it
    fields[k] = v;
  }
  return { fields, droppedProhibited, droppedByConsent };
}
