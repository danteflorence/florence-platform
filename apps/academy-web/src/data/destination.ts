/** The other side of the door: what a U.S. RN license leads to.
 *
 *  Wage figures are computed from the Florence Workforce Economist hospital
 *  universe (labor-economics-agent/data/per_hospital_rn_wages.csv, HCRIS 2025
 *  blend): median taxable RN wage across 5,432 U.S. hospitals = $47.96/hr
 *  (about $99,800/yr at 2,080 hours); California median = $68.61/hr
 *  ($142,709/yr, n=378 hospitals, the highest-paying state with 20+ hospitals
 *  tracked). Openings figure: U.S. Bureau of Labor Statistics Employment
 *  Projections, roughly 194,500 projected RN openings per year, stated
 *  conservatively as 190,000+. Re-derive these when the OEWS 2025 ingest
 *  lands rather than editing values in place.
 */

export const DESTINATION = {
  medianHourly: 48,
  medianAnnualApprox: "near $100,000 a year at full-time hours",
  hospitalsTracked: 5432,
  topStateAnnual: 142000,
  topStateName: "California",
  annualOpenings: "190,000+",
} as const;

/** Live open RN roles with Florence employer partners.
 *  null = no partner contracts counting yet; the tile renders a truthful
 *  "counting soon" state. Set a real number (or wire the Opportunity Graph
 *  count) once employer contracts land. Never display a fabricated number.
 */
export const PARTNER_OPEN_ROLES: number | null = null;
