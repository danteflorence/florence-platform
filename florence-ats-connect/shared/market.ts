// Pure, shared (server + client) helpers for the Long-Tail Demand Radar. A "market"
// is a normalized City+State key (NO MSA/CBSA model — that's deferred). One function
// owns normalization so tiles and NurseMarketInterest never fragment on casing/aliases.
import type { DemandSpecialty, DemandSetting, RoleCategory } from './demand-types'

// Curated aliases for launch metros (extend as markets are added). Keyed by the
// collapsed lowercase form → canonical collapsed city.
const CITY_ALIAS: Record<string, string> = {
  la: 'los angeles', lax: 'los angeles', 'l a': 'los angeles',
  sf: 'san francisco', sfo: 'san francisco',
  nyc: 'new york', ny: 'new york',
  philly: 'philadelphia',
  vegas: 'las vegas',
}

const collapse = (s: string): string => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const titleCase = (s: string): string => s.replace(/\b\w/g, (m) => m.toUpperCase())

export interface NormalizedMarket {
  key: string // stable join key, e.g. "los angeles|CA"
  display: string // human-readable, e.g. "Los Angeles, CA"
  state: string // 2-letter, uppercased
}

/** Normalize a (city, state) into a stable market key + display. Requires a 2-letter
 *  state; throws otherwise (markets are never freeform-state). */
export function normalizeMarket(city: string | undefined, state: string | undefined): NormalizedMarket {
  const st = (state ?? '').trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(st)) throw new Error('market requires a 2-letter US state')
  let c = collapse(city ?? '')
  c = CITY_ALIAS[c] ?? c
  if (!c) c = 'statewide'
  return { key: `${c}|${st}`, display: `${titleCase(c)}, ${st}`, state: st }
}

/** Best-effort parse of a free-text location string ("Bakersfield, CA") → NormalizedMarket | null. */
export function parseMarket(location: string | undefined): NormalizedMarket | null {
  if (!location) return null
  const parts = location.split(',').map((p) => p.trim()).filter(Boolean)
  if (parts.length >= 2) {
    const st = parts[parts.length - 1].slice(0, 2)
    try { return normalizeMarket(parts.slice(0, -1).join(' '), st) } catch { return null }
  }
  return null
}

// DemandSpecialty + DemandSetting → the long-tail RoleCategory taxonomy.
const SPECIALTY_TO_CATEGORY: Partial<Record<DemandSpecialty, RoleCategory>> = {
  home_health: 'home_health_rn', dialysis: 'dialysis_rn', hospice: 'hospice_rn',
  snf: 'snf_rn', clinic: 'clinic_rn',
}
const SETTING_TO_CATEGORY: Partial<Record<DemandSetting, RoleCategory>> = {
  home_health: 'home_health_rn', home_care: 'home_health_rn', dialysis: 'dialysis_rn',
  hospice: 'hospice_rn', snf: 'snf_rn', clinic: 'clinic_rn', physician_practice: 'clinic_rn', asc: 'asc_rn',
}

/** Map the EXISTING specialty/setting unions onto a RoleCategory (specialty wins; else setting; else other_rn). */
export function roleCategoryOf(specialty?: DemandSpecialty, setting?: DemandSetting): RoleCategory {
  return (specialty && SPECIALTY_TO_CATEGORY[specialty]) || (setting && SETTING_TO_CATEGORY[setting]) || 'other_rn'
}

const CATEGORY_LABEL: Record<RoleCategory, string> = {
  home_health_rn: 'Home Health RN', dialysis_rn: 'Dialysis RN', hospice_rn: 'Hospice RN',
  snf_rn: 'SNF RN', clinic_rn: 'Clinic RN', asc_rn: 'ASC RN', other_rn: 'RN',
}
export const roleCategoryLabel = (rc: RoleCategory): string => CATEGORY_LABEL[rc]

/** Candidate CTA for a category tile: an UNCLAIMED tile can only "express interest". */
export function tileCta(claimed: boolean): 'im_interested' | 'view_role' {
  return claimed ? 'view_role' : 'im_interested'
}
