// Deficiency-response engine. Board deficiency letters are where operations die:
// they're repetitive, expensive, and delay-inducing. This classifies each item in
// a deficiency notice into a known category, then attaches the owner, an SLA, and
// a response checklist — so a notice becomes a routed, tracked work item instead
// of a fire drill.
import type { Owner } from './types'

export type DeficiencyCategory =
  | 'missing_transcript'
  | 'name_mismatch'
  | 'fingerprints'
  | 'coursework'
  | 'fee'
  | 'expired_doc'
  | 'license_verification'
  | 'clarification'
  | 'other'

export interface DeficiencyClass {
  category: DeficiencyCategory
  label: string
  owner: Owner
  slaDays: number
  checklist: string[]
  /** The notice items that mapped to this category. */
  items: string[]
}

interface CategoryDef {
  label: string
  owner: Owner
  slaDays: number
  checklist: string[]
  match: RegExp
}

const CATEGORY_DEFS: Record<Exclude<DeficiencyCategory, 'other'>, CategoryDef> = {
  missing_transcript: {
    label: 'Missing transcript / education record', owner: 'system', slaDays: 14,
    checklist: ['Request the official transcript from the issuing school', 'Send it directly to the board / CGFNS', 'Confirm receipt'],
    match: /transcript|academic record|education record|mark ?sheet/i,
  },
  name_mismatch: {
    label: 'Name mismatch', owner: 'candidate', slaDays: 7,
    checklist: ['Provide your name exactly as printed on your passport', 'Supply a marriage certificate / legal name-change document if applicable', 'Submit a name affidavit if the board requires one'],
    match: /name|mismatch|does not match|spelling|discrepan/i,
  },
  fingerprints: {
    label: 'Fingerprints not received', owner: 'candidate', slaDays: 10,
    checklist: ['Complete Live Scan / fingerprint capture (in person after arrival)', 'Use the correct board ORI / service code', 'Confirm the board received the results'],
    match: /fingerprint|live ?scan|criminal background|cbc/i,
  },
  coursework: {
    label: 'Coursework missing', owner: 'candidate', slaDays: 21,
    checklist: ['Complete the required coursework (e.g. infection control, child abuse)', 'Submit the completion certificate to the board'],
    match: /course ?work|infection control|child abuse|pharmacolog|continuing ed|\bce\b/i,
  },
  fee: {
    label: 'Fee outstanding', owner: 'candidate', slaDays: 3,
    checklist: ['Pay the outstanding fee on the official board portal', 'Keep the payment receipt', 'Confirm the payment posted'],
    match: /\bfee\b|payment|unpaid|remit/i,
  },
  expired_doc: {
    label: 'Document expired', owner: 'candidate', slaDays: 7,
    checklist: ['Renew the expired document', 'Submit the updated document to the board'],
    match: /expir|out of date|no longer valid/i,
  },
  license_verification: {
    label: 'License verification missing', owner: 'system', slaDays: 14,
    checklist: ['Request Nursys / non-Nursys verification of the source license', 'Confirm the destination board received it'],
    match: /verif|nursys|license verification|endorsement verification/i,
  },
  clarification: {
    label: 'Board needs clarification', owner: 'qa', slaDays: 7,
    checklist: ['Draft a clarification response addressing the board’s question', 'QA review before submission'],
    match: /clarif|please explain|provide an explanation|additional information|question regarding/i,
  },
}

const OTHER: CategoryDef = {
  label: 'Other / needs review', owner: 'qa', slaDays: 7,
  checklist: ['Review the notice and determine the required response', 'Assign an owner and draft a response'],
  match: /.*/,
}

export function classifyDeficiencyItem(item: string): DeficiencyCategory {
  for (const [cat, def] of Object.entries(CATEGORY_DEFS) as [DeficiencyCategory, CategoryDef][]) {
    if (def.match.test(item)) return cat
  }
  return 'other'
}

/** Classify a whole deficiency notice into routed, SLA'd work items. */
export function classifyDeficiency(items: string[]): DeficiencyClass[] {
  const byCat = new Map<DeficiencyCategory, string[]>()
  for (const item of items) {
    const cat = classifyDeficiencyItem(item)
    byCat.set(cat, [...(byCat.get(cat) ?? []), item])
  }
  return [...byCat.entries()].map(([category, matched]) => {
    const def = category === 'other' ? OTHER : CATEGORY_DEFS[category]
    return { category, label: def.label, owner: def.owner, slaDays: def.slaDays, checklist: def.checklist, items: matched }
  }).sort((a, b) => a.slaDays - b.slaDays) // most-urgent first
}

/** The tightest SLA across a notice's categories — drives the due date. */
export function deficiencySla(classes: DeficiencyClass[]): number {
  return classes.length ? Math.min(...classes.map((c) => c.slaDays)) : 7
}
