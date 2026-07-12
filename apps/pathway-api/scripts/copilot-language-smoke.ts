// Multilingual grounded copilot smoke — localized frame in the nurse's
// language, deterministic official-source citations on every answer, honest
// translation note in heuristic mode, English default untouched.
import { store, uid, now, getDossier } from '../server/db'
import { copilotReply, groundingSources } from '../server/agents/candidateGuide'
import { instantiateWorkflow } from '../server/agents/workflow'
import { getLanguage, SUPPORTED_LANGUAGE_CODES } from '../shared/languages'
import type { CandidateProfile } from '../shared/types'

let pass = 0, fail = 0
const ok = (l: string, c: boolean, x?: string) => { console.log(`${c ? '✓' : '✗'} ${l}${x ? ` — ${x}` : ''}`); c ? (pass += 1) : (fail += 1) }
const run = uid().slice(0, 8)

async function main() {
  ok('corridor languages present (tl/hi/sw + en)', ['en', 'tl', 'hi', 'sw'].every((c) => SUPPORTED_LANGUAGE_CODES.includes(c)))
  ok('unknown code falls back to English', getLanguage('xx').code === 'en')

  const c: CandidateProfile = {
    id: `cand-${run}`, legalFirstName: 'Rosa', legalLastName: 'Santos', aliases: [],
    dateOfBirth: '1994-08-08', citizenship: 'Philippines', nationality: 'Filipino',
    countryOfResidence: 'Philippines', email: `lang-${run}@example.test`,
    preferredLanguage: 'tl',
    createdAt: now(), updatedAt: now(),
  } as CandidateProfile
  await store.candidates.insert(c)
  const w = instantiateWorkflow('cgfns_ces', c.id)
  await store.workflows.insert(w)

  const d = await getDossier(c.id)
  ok('dossier assembled', Boolean(d))

  // ── grounding: citations come from the active workflow's official sources ──
  const sources = groundingSources(d!)
  ok('grounding sources exist for the active workflow', sources.length >= 1)
  ok('citations point at real urls', sources.every((s) => s.url.startsWith('http')))

  // ── Tagalog frame + citations + honest note ──
  const replyTl = await copilotReply(d!, 'What do I do next?', [], [])
  ok('Tagalog greeting frames the answer', replyTl.startsWith('Kumusta Rosa'))
  ok('Tagalog sources header present', replyTl.includes('Mga opisyal na sanggunian'))
  ok('answer carries at least one citation url', replyTl.includes(sources[0]!.url))
  ok('honest translation note in heuristic mode', replyTl.includes('Model Gateway'))

  // ── English default: no note, English frame ──
  c.preferredLanguage = 'en'
  await store.candidates.update(c)
  const replyEn = await copilotReply((await getDossier(c.id))!, 'What do I do next?', [], [])
  ok('English greeting by default', replyEn.startsWith('Hi Rosa'))
  ok('no translation note in English', !replyEn.includes('Paunawa'))
  ok('citations still present in English', replyEn.includes('Official sources'))

  console.log(`\nCOPILOT LANGUAGE SMOKE ${fail === 0 ? 'PASSED' : 'FAILED'} — ${pass} passed, ${fail} failed`)
  process.exit(fail > 0 ? 1 : 0)
}

main().catch((e) => { console.error('smoke crashed:', (e as Error).message); process.exit(1) })
