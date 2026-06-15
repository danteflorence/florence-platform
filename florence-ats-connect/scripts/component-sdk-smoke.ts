// FlorenceRN Component SDK smoke. Proves the embeddable NursePassport widget's
// render pipeline (SDK fetch → view-model) and its render-layer defense-in-depth:
// visa/financing are NEVER rendered, even on a non-redacted payload. Runs in Node
// (no DOM) by testing the pure model + the SDK fetch path with a mock fetch.
import { FlorenceRN } from '../sdk/florencern'
import { passportCardModel, NEVER_RENDER } from '../sdk/components/passportCardModel'
import { jobTilesModel, applicationGateModel, pricingQuoteModel } from '../sdk/components/widgetModels'
import NursePassportCard from '../sdk/components/NursePassportCard'
import JobTiles from '../sdk/components/JobTiles'
import ApplicationGate from '../sdk/components/ApplicationGate'

let pass = 0, fail = 0
const ok = (l: string, c: boolean, x?: string) => { console.log(`${c ? '✓' : '✗'} ${l}${x ? ` — ${x}` : ''}`); c ? (pass += 1) : (fail += 1) }

async function main() {
  // 1. Defense-in-depth: a LEAKY object still never renders visa/nationality/financing.
  const leaky = { readinessBand: 'green', visaStatus: 'approved', nationality: 'NG', financing: { balance: 1000 }, licenseStatus: 'issued', ssn: '***' }
  const m = passportCardModel(leaky)
  ok('model: drops visa/nationality/financing/ssn (render-layer defense)', m.redactedKeys.includes('visaStatus') && m.redactedKeys.includes('financing') && m.redactedKeys.includes('nationality') && m.redactedKeys.includes('ssn'))
  ok('model: keeps the readiness band + license', m.rows.some((r) => r.value === 'green') && m.rows.some((r) => r.value === 'issued'))
  ok('model: serialized rows contain NO visa/financing/nationality value', !/visa|approved|financ|national|ssn/i.test(JSON.stringify(m.rows)))

  // 2. SDK → model: a mock fetch returns an employer view (already redacted, no visa).
  const mockFetch = (async () => new Response(JSON.stringify({
    view: 'employer', nurseId: 'c1', withheld: [{ field: 'visaStatus' }],
    passport: { readinessBand: 'green', licenseStatus: 'issued', specialtyExperience: ['med_surg'] },
  }), { status: 200, headers: { 'content-type': 'application/json' } })) as unknown as typeof fetch
  const client = new FlorenceRN({ baseUrl: 'http://mock', token: 't', fetchImpl: mockFetch })
  const view = await client.passport('c1', 'employer') as { passport: Record<string, unknown> }
  const rows = passportCardModel(view.passport).rows
  ok('SDK→model: employer view renders band, no visa', rows.some((r) => r.value === 'green') && !/visa/i.test(JSON.stringify(rows)))

  // 3. The widgets are importable + React components (functions).
  ok('NursePassportCard is a React component (function)', typeof NursePassportCard === 'function')
  ok('JobTiles + ApplicationGate are React components', typeof JobTiles === 'function' && typeof ApplicationGate === 'function')
  ok('NEVER_RENDER catalog lists visa + financing', (NEVER_RENDER as readonly string[]).includes('visastatus') && (NEVER_RENDER as readonly string[]).includes('financing'))

  // 4. JobTiles model: gate-aware CTA, no visa leakage.
  const tiles = jobTilesModel([{ id: 'j1', title: 'RN', employerName: 'Kaiser', city: 'Reno', state: 'NV', cta: 'apply_with_packet' }, { id: 'j2', title: 'RN', state: 'TX' }])
  ok('jobTilesModel: maps CTA + location, defaults to express_interest', tiles[0].cta === 'apply_with_packet' && tiles[0].location === 'Reno, NV' && tiles[1].cta === 'express_interest')

  // 5. ApplicationGate model: surfaces missing gates + action; never the visa value.
  const gv = applicationGateModel({ applicationGateStatus: 'visa_pending', allowedAction: 'express_interest', missing: ['visa_approved', 'employer_packet_qa_approved'], subjectTo: ['consular_processing'] })
  ok('applicationGateModel: labels missing gates + keeps action + subjectTo', gv.action === 'express_interest' && gv.missing.some((m) => m.label === 'Visa approved') && gv.subjectTo.includes('consular_processing'))

  // 6. PricingQuote model: FICA stays customer effective-cost, never revenue.
  const pq = pricingQuoteModel({ monthlyFeePerRnUsd: 1750, effectiveCostPerRnMonthUsd: 1050, channel: 'direct', note: 'FICA offset is customer effective-cost, never FlorenceRN revenue.' })
  ok('pricingQuoteModel: rows + FICA-customer-side note', pq.rows.length === 3 && /effective-cost/i.test(pq.note) && !/revenue (from|is) fica/i.test(pq.note))

  console.log(`\n${fail ? 'COMPONENT SDK SMOKE FAILED' : 'COMPONENT SDK SMOKE PASSED'} — ${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error(e); process.exit(1) })
