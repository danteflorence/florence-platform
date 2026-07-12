// Document-intake smoke — proves extract→confirm→consistency without any model:
// the heuristic provider parses a real TD3 MRZ; the sanitizer enforces the
// last-4 rule and the field allowlist; candidate confirmation creates the
// passport IdentityDocument that feeds name-match QA (deficiency prevention).
import { store, uid, now, getDossier } from '../server/db'
import { getLlm } from '../server/llm/provider'
import { extractFacts } from '../server/agents/dataExtraction'
import type { CandidateProfile } from '../shared/types'

let pass = 0, fail = 0
const ok = (l: string, c: boolean, x?: string) => { console.log(`${c ? '✓' : '✗'} ${l}${x ? ` — ${x}` : ''}`); c ? (pass += 1) : (fail += 1) }
const run = uid().slice(0, 8)

// A syntactically-valid TD3 MRZ (synthetic data, clearly fake).
const MRZ = [
  'P<PHLDELACRUZ<<MARIA<CLARA<<<<<<<<<<<<<<<<<<',
  'X1234567<8PHL9202031F30011015<<<<<<<<<<<<<<04',
].join('\n')

async function main() {
  // ── heuristic extraction parses the MRZ ──
  const llm = getLlm()
  ok('provider is heuristic (no gateway configured)', llm.mode === 'heuristic')
  const p = await llm.extractDocument({ kind: 'passport_scan', filename: 'passport.jpg', textContent: MRZ })
  ok('MRZ → family name', p.fields.familyName === 'DELACRUZ', p.fields.familyName)
  ok('MRZ → given names', p.fields.givenNames === 'MARIA CLARA', p.fields.givenNames)
  ok('MRZ → date of birth (century-resolved)', p.fields.dateOfBirth === '1992-02-03', p.fields.dateOfBirth)
  ok('MRZ → expiry', p.fields.expirationDate === '2030-01-10', p.fields.expirationDate)
  ok('MRZ → issuing state', p.fields.issuingAuthority === 'PHL')
  ok('document number truncated to LAST 4 at the seam', p.fields.documentNumberLast4 === '4567', p.fields.documentNumberLast4)
  ok('full number NEVER present in the proposal', !JSON.stringify(p.fields).includes('X1234567'))
  ok('proposal confidence is medium (MRZ-parsed, unconfirmed)', p.confidence === 'medium')

  // ── photo without MRZ → empty proposal + honest note (no invention) ──
  const empty = await llm.extractDocument({ kind: 'passport_scan', filename: 'p.jpg', imageBase64: 'aGk=' })
  ok('photo without vision provider → NO invented fields', Object.keys(empty.fields).length === 0)
  ok('…and an honest note pointing at the gateway', empty.notes.some((n) => n.includes('Model Gateway')))

  // ── end-to-end through the store: upload-shape → confirm-shape ──
  const c: CandidateProfile = {
    id: `cand-${run}`, legalFirstName: 'Maria Clara', legalLastName: 'Dela Cruz', aliases: [],
    dateOfBirth: '1992-02-03', citizenship: 'Philippines', nationality: 'Filipino',
    countryOfResidence: 'Philippines', email: `intake-${run}@example.test`,
    createdAt: now(), updatedAt: now(),
  } as CandidateProfile
  await store.candidates.insert(c)

  const doc = { id: uid(), candidateId: c.id, kind: 'passport_scan' as const, filename: 'passport.jpg', uploadedAt: now(), extracted: false, extractionConfidence: 'medium' as const, fields: p.fields }
  await store.documents.insert(doc)

  // Candidate confirms → IdentityDocument (mirrors the confirm route's mapping).
  const idDoc = {
    id: uid(), candidateId: c.id, kind: 'passport' as const,
    nameOnDocument: p.fields.nameOnDocument!, dateOfBirth: p.fields.dateOfBirth,
    expirationDate: p.fields.expirationDate, issuingAuthority: p.fields.issuingAuthority,
    status: 'document_extracted' as const, confidence: 'high' as const,
  }
  await store.identityDocuments.insert(idDoc)
  doc.extracted = true
  await store.documents.update(doc)

  const d = await getDossier(c.id)
  ok('dossier carries the confirmed passport identity document', d?.identityDocuments.some((i) => i.nameOnDocument === 'MARIA CLARA DELACRUZ') === true)

  // ── the confirmed document feeds name-match consistency ──
  const facts = extractFacts(d!)
  const passportNames = facts.names.filter((n) => n.sourceType === 'passport_scan' || /passport/i.test(n.source))
  ok('name-match input includes the passport observation', passportNames.length >= 1)
  ok('profile-vs-passport spelling difference is VISIBLE to QA (space in surname)',
    facts.profileFullName.toUpperCase().includes('DELA CRUZ') && passportNames.some((n) => n.name.includes('DELACRUZ')))

  console.log(`\nDOCUMENT INTAKE SMOKE ${fail === 0 ? 'PASSED' : 'FAILED'} — ${pass} passed, ${fail} failed`)
  process.exit(fail > 0 ? 1 : 0)
}

main().catch((e) => { console.error('smoke crashed:', (e as Error).message); process.exit(1) })
