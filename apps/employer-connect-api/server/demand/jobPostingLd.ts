// Schema.org JobPosting (JSON-LD) → IngestRow[]. PURE (no fetching) — the load-bearing,
// compliance-neutral piece. A fetching connector that pulls career-page HTML + extracts
// <script type="application/ld+json"> is STAGED behind the robots/ToS crawl gate (counsel-
// controlled) and is NOT shipped here.
import type { IngestRow } from './ingest'

const asArray = (x: unknown): any[] => (Array.isArray(x) ? x : x == null ? [] : [x])

/** Walk a JSON-LD value (object, array, or @graph) and collect JobPosting nodes. */
function collectJobPostings(jsonLd: unknown): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = []
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) { node.forEach(visit); return }
    if (!node || typeof node !== 'object') return
    const o = node as Record<string, unknown>
    if (asArray(o['@graph']).length) asArray(o['@graph']).forEach(visit)
    const types = asArray(o['@type']).map(String)
    if (types.includes('JobPosting')) out.push(o)
  }
  visit(jsonLd)
  return out
}

const text = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined)

function orgName(p: Record<string, unknown>): string {
  const ho = p.hiringOrganization
  if (typeof ho === 'string') return ho
  if (ho && typeof ho === 'object') return text((ho as any).name) ?? 'Unknown Employer'
  return 'Unknown Employer'
}

function place(p: Record<string, unknown>): { city?: string; state?: string } {
  const loc = asArray(p.jobLocation)[0]
  const addr = loc && typeof loc === 'object' ? (loc as any).address : undefined
  if (addr && typeof addr === 'object') return { city: text((addr as any).addressLocality), state: text((addr as any).addressRegion) }
  return {}
}

/** baseSalary → a $X–$Y description fragment so the existing parsePay picks it up. */
function salaryText(p: Record<string, unknown>): string {
  const bs = p.baseSalary
  if (!bs || typeof bs !== 'object') return ''
  const value = (bs as any).value
  const unitRaw = String((value && (value as any).unitText) ?? (bs as any).unitText ?? '').toLowerCase()
  const unit = unitRaw.includes('hour') ? '/hr' : unitRaw.includes('year') ? '/year' : unitRaw.includes('month') ? '/month' : '/hr'
  const min = value && (value as any).minValue, max = value && (value as any).maxValue, val = value && (value as any).value
  if (min != null && max != null) return ` $${min}-$${max} per ${unit.slice(1)}`
  if (val != null) return ` $${val} per ${unit.slice(1)}`
  return ''
}

export function parseJobPostingLd(jsonLd: unknown, opts: { sourceUrl?: string } = {}): IngestRow[] {
  return collectJobPostings(jsonLd).map((p) => {
    const { city, state } = place(p)
    const desc = `${text(p.description) ?? ''}${salaryText(p)}`.trim()
    return {
      employerName: orgName(p),
      title: text(p.title) ?? 'Registered Nurse',
      ...(desc ? { description: desc } : {}),
      ...(city ? { city } : {}),
      ...(state ? { state } : {}),
      ...(text(p.identifier as string) ? { atsRequisitionId: text(p.identifier as string) } : {}),
      ...(text(p.url) ?? opts.sourceUrl ? { sourceUrl: text(p.url) ?? opts.sourceUrl } : {}),
      employmentType: undefined,
      raw: p,
    } as IngestRow
  })
}
