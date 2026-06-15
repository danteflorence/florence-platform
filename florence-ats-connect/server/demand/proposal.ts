// Automated proposal generation — turns an account (demand + matched supply + economics
// + recommended pilot) into a DRAFT proposal. Always human-review-gated: status:'draft',
// never auto-sent. Builds on the demand brief + the zero-dep PDF composer. No financing/
// underwriting data ever appears (same redaction posture as the brief).
import { now } from '../db'
import { composePdf } from '../resumePdf'
import { buildDemandBrief, type DemandBrief } from './brief'

export interface Proposal {
  employer: string
  route: 'amn' | 'direct'
  status: 'draft' // never auto-sent; a human reviews + sends
  generatedAt: string
  brief: DemandBrief
  summary: string
  pilotPlan: string[]
  termsSummary: string[]
}

export async function buildProposal(employerName: string, route: 'amn' | 'direct' = 'direct'): Promise<Proposal> {
  const brief = await buildDemandBrief(employerName, route)
  const fee = brief.economics.avgGrossFeePerRnMonth
  const summary = `FlorenceRN proposes a ${brief.pilot.recommendedFirstWaveStarts}-RN pilot for ${employerName} across ${brief.jobs.states.join(', ') || 'target states'}, focused on ${brief.pilot.topSpecialties.join(', ') || 'priority specialties'}. ${brief.supply.licensed} licensed + ${brief.supply.nearLicensed} near-licensed FlorenceRN nurses already map to this demand.`
  const pilotPlan = [
    `Wave 1: ${brief.pilot.recommendedFirstWaveStarts} RN start(s) in ${brief.pilot.topSpecialties.join(', ') || 'top specialties'}.`,
    'Each candidate: licensed + QA-approved + consent-gated packet (no visa/financing data shared).',
    route === 'amn' ? 'Routed through the AMN account team; FlorenceRN supplies licensed supply.' : 'Direct employer engagement with FlorenceRN as supply partner.',
    '30-day design sprint: packet format, employer review process, ATS/manual bridge, start attestation.',
  ]
  const termsSummary = [
    `Subscription fee: ~$${fee.toLocaleString()}/RN/month (FlorenceRN revenue).`,
    `Eligible employer payroll-tax (FICA) offset: ~$${brief.economics.avgPayrollTaxOffsetPerRnMonth.toLocaleString()}/RN/month — accrues to the employer, NOT FlorenceRN revenue.`,
    `Effective monthly cost after offset: ~$${brief.economics.avgEffectiveCostPerRnMonth.toLocaleString()}/RN/month.`,
    'Billing on HRIS/attestation-verified starts only; recurring monthly.',
  ]
  return { employer: employerName, route, status: 'draft', generatedAt: now(), brief, summary, pilotPlan, termsSummary }
}

export function renderProposalPdf(p: Proposal): Buffer {
  const items: { text: string; size?: number; bold?: boolean; gap?: number }[] = [
    { text: `${p.employer} — RN Staffing Proposal (DRAFT)`, size: 18, bold: true },
    { text: `FlorenceRN · ${p.route === 'amn' ? 'AMN channel' : 'direct'} · ${p.generatedAt.slice(0, 10)} · HUMAN REVIEW REQUIRED before sending`, size: 9, gap: 2 },

    { text: 'Summary', size: 13, bold: true, gap: 14 },
    { text: p.summary, gap: 3 },

    { text: 'Pilot plan', size: 13, bold: true, gap: 14 },
    ...p.pilotPlan.map((t) => ({ text: `– ${t}`, size: 10, gap: 1 })),

    { text: 'Commercial terms', size: 13, bold: true, gap: 14 },
    ...p.termsSummary.map((t) => ({ text: `– ${t}`, size: 10, gap: 1 })),

    { text: 'DRAFT — internal review required before sending. FlorenceRN-matched opportunities, not an employer endorsement. Estimates from public/partner demand + FlorenceRN supply; validate via the Workforce Economist.', size: 8, gap: 14 },
  ]
  return composePdf(items)
}
