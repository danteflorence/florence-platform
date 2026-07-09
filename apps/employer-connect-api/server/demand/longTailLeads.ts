// Long-Tail lead scoring — Tier A–D per market×role lead. Supply is STATE-level and
// HONESTLY LABELED ("licensed RNs targeting {state}") — there is no city-level candidate
// geo, so we never imply market-level supply. Market interest (consented) is the only
// truly market-granular signal. Conservative: confidence is 'low' when a tier rests on
// state-inferred supply.
import { store } from '../db'
import { roleCategoryLabel } from '../../shared/market'
import type { LeadTier, RoleCategory, Confidence } from '../../shared/demand-types'

export interface LongTailLead {
  key: string // `${market}|${roleCategory}`
  employerName?: string // only when a known signal/claim names one
  market: string
  marketDisplay: string
  roleCategory: RoleCategory
  tier: LeadTier
  signalCount: number
  interestCount: number // consented aggregate
  licensedSupply: number // candidates licensed in the market STATE (labeled state-level)
  nearLicensedSupply: number
  claimed: boolean
  confidence: Confidence
  rationale: string[]
}

const stateOf = (marketKey: string): string => marketKey.split('|')[1] ?? ''
const isLicensed = (c: { licenseStatus: string }) => c.licenseStatus === 'issued' || c.licenseStatus === 'approved'
const isNear = (c: { licenseStatus: string; nclexStatus: string }) => !isLicensed(c) && c.nclexStatus === 'passed'

export async function rankLongTailLeads(limit = 50): Promise<LongTailLead[]> {
  const [signals, interests, claimed, candidates] = await Promise.all([
    store.hiringSignals.all(), store.marketInterest.all(), store.claimedJobs.all(), store.candidates.all(),
  ])

  // Group demand + interest by market×role.
  const leads = new Map<string, LongTailLead>()
  const touch = (market: string, marketDisplay: string, roleCategory: RoleCategory): LongTailLead => {
    const key = `${market}|${roleCategory}`
    let l = leads.get(key)
    if (!l) { l = { key, market, marketDisplay, roleCategory, tier: 'D', signalCount: 0, interestCount: 0, licensedSupply: 0, nearLicensedSupply: 0, claimed: false, confidence: 'low', rationale: [] }; leads.set(key, l) }
    return l
  }
  for (const s of signals) { const l = touch(s.market, s.marketDisplay ?? s.market, s.roleCategory); l.signalCount += 1; if (s.employerName && !l.employerName) l.employerName = s.employerName }
  for (const i of interests) { if (!i.consentToShareAggregate) continue; touch(i.market, i.marketDisplay ?? i.market, i.roleCategory).interestCount += 1 }
  for (const c of claimed) {
    const job = c.florenceRnJobId ? await store.demandJobs.get(c.florenceRnJobId) : null
    const st = (job?.state ?? job?.requiredLicenseState ?? c.state ?? '').toUpperCase()
    if (!st) continue
    // Reconstruct the market key the same way tiles do, from the job city+state.
    const display = job?.city ? `${job.city}, ${st}` : st
    const key = [...leads.keys()].find((k) => stateOf(k) === st && k.endsWith(`|${c.roleCategory}`))
    const l = key ? leads.get(key)! : touch(`${(job?.city ?? '').toLowerCase() || 'statewide'}|${st}`, display, c.roleCategory)
    l.claimed = true
  }

  // State-level supply (honestly labeled).
  for (const l of leads.values()) {
    const st = stateOf(l.market)
    const inState = candidates.filter((c) => (c.targetStates ?? []).map((s) => s.toUpperCase()).includes(st))
    l.licensedSupply = inState.filter(isLicensed).length
    l.nearLicensedSupply = inState.filter(isNear).length
  }

  // Tier + confidence + rationale.
  for (const l of leads.values()) {
    const hasDemand = l.signalCount > 0 || l.claimed
    const hasInterest = l.interestCount > 0
    const hasSupply = l.licensedSupply > 0 || l.nearLicensedSupply > 0
    if (hasDemand && hasInterest && hasSupply) l.tier = 'A'
    else if (hasDemand && hasInterest) l.tier = 'B'
    else if (hasDemand) l.tier = 'C'
    else l.tier = 'D'
    // Confidence: market-granular interest lifts to medium; supply alone is state-inferred (low).
    l.confidence = hasInterest ? 'medium' : 'low'
    l.rationale = [
      `${l.signalCount} hiring signal(s)${l.claimed ? ' + a claimed role' : ''} for ${roleCategoryLabel(l.roleCategory)} in ${l.marketDisplay}`,
      `${l.interestCount} consented nurse interest(s) in this market×role`,
      `${l.licensedSupply} licensed + ${l.nearLicensedSupply} near-licensed RNs targeting ${stateOf(l.market)} (state-level, not city-level)`,
    ]
  }

  const order: Record<LeadTier, number> = { A: 3, B: 2, C: 1, D: 0 }
  return [...leads.values()]
    .sort((a, b) => order[b.tier] - order[a.tier] || (b.interestCount + b.signalCount) - (a.interestCount + a.signalCount))
    .slice(0, limit)
}
