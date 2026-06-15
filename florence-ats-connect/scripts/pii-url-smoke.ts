// No-PII-in-URL/UTM CI gate. Two checks: (1) FUNCTIONAL — a built tracked-link
// destination carries ONLY utm_* + an opaque frn_click_id, never candidate PII;
// (2) SOURCE SCAN — the link/outreach builders never assemble a URL query from a
// PII field. The opaque frn_click_id is the only join key that may appear in a URL.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createLink, buildDestination } from '../server/links'

let pass = 0, fail = 0
const ok = (l: string, c: boolean, x?: string) => { console.log(`${c ? '✓' : '✗'} ${l}${x ? ` — ${x}` : ''}`); c ? (pass += 1) : (fail += 1) }

const ALLOWED_QS = new Set(['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'frn_click_id'])
const PII_QS_PATTERN = /(set|append)\(\s*['"`](email|name|fullname|firstname|lastname|license|licensenumber|visa|visastatus|ssn|dob|dateofbirth|phone|nationality)\b/i
const PII_IN_URL_PATTERN = /[?&](email|name|fullname|license|visa|ssn|phone|nationality)=/i

async function main() {
  // ── functional: a real tracked link → destination has only utm_* + frn_click_id ──
  const link = await createLink({ destinationUrl: 'https://florenceedu.com/jobs/abc', utmSource: 'amn', utmMedium: 'email', utmCampaign: 'kaiser_nv', campaignType: 'partner' })
  const dest = buildDestination(link, 'frnclick_opaque_123')
  const url = new URL(dest)
  const keys = [...url.searchParams.keys()]
  ok('built link: query keys ⊆ {utm_*, frn_click_id}', keys.every((k) => ALLOWED_QS.has(k)), keys.join(','))
  ok('built link: frn_click_id present + opaque (no @)', url.searchParams.get('frn_click_id') === 'frnclick_opaque_123' && !/@/.test(dest))
  ok('built link: no PII key in the URL', !PII_IN_URL_PATTERN.test(dest))

  // ── source scan: the builders never put a PII field into a URL query ──────────
  const root = process.cwd()
  const files = [
    'server/links.ts',
    'server/demand/outreach.ts',
    'server/demand/longTail.ts',
    'server/demand/longTailLeads.ts',
    'server/demand/publicCard.ts',
  ]
  for (const f of files) {
    let src = ''
    try { src = readFileSync(join(root, f), 'utf8') } catch { continue }
    const offending = src.split('\n').map((line, i) => ({ line, i: i + 1 }))
      .filter(({ line }) => PII_QS_PATTERN.test(line) || (PII_IN_URL_PATTERN.test(line) && /http|url|searchParams|\?|&/.test(line)))
    ok(`source: ${f} assembles NO PII into a URL query`, offending.length === 0, offending.map((o) => `L${o.i}`).join(','))
  }

  console.log(`\n${fail ? 'PII-URL SMOKE FAILED' : 'PII-URL SMOKE PASSED'} — ${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error(e); process.exit(1) })
