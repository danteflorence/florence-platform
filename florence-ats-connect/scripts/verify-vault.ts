// Phase A/B/C verification (connect foundation): vault, connections repo at-rest
// encryption, and the self-serve provision service (Merge + Greenhouse), on
// whichever backend ATS_DB selects. Runs without HTTP/Core — exercises the
// service layer directly. Run with ATS_DB=sqlite (default) and ATS_DB=postgres.
import { store, uid, now } from '../server/db'
import { encryptSecret, decryptSecret } from '../server/vault'
import { provisionMergeFromPublicToken, provisionGreenhouse } from '../server/connectService'
import { applyWebhookStatus } from '../server/webhookService'
import type { EmployerAccount, AtsConnection, ATSApplication } from '../shared/types'

const ok = (label: string, cond: boolean, extra?: string) => {
  console.log(`${cond ? '✓' : '✗'} ${label}${extra ? ` — ${extra}` : ''}`)
  if (!cond) process.exitCode = 1
}
const backend = process.env.ATS_DB === 'postgres' ? 'postgres' : 'sqlite'

// --- vault ----------------------------------------------------------------
const plain = 'merge_account_token_ABC123!secret'
const blob = encryptSecret(plain)
ok('vault encrypts (blob != plaintext)', blob !== plain && !blob.includes(plain), blob.slice(0, 28) + '…')
ok('vault decrypts (round-trip)', decryptSecret(blob) === plain)

// --- connections repo: at-rest encryption --------------------------------
const emp: EmployerAccount = { id: uid(), name: 'Vault Test Health', atsProvider: 'merge', integrationStatus: 'active', defaultBillingModel: 'direct', sourceChannel: 'direct', createdAt: now(), updatedAt: now() }
await store.employers.insert(emp)
const conn: AtsConnection = { id: uid(), employerId: emp.id, provider: 'merge', externalAccountId: 'acct_123', status: 'active', createdAt: now() }
await store.connections.insert(conn, encryptSecret(plain))
const got = await store.connections.get(conn.id)
ok('connection persisted', got?.id === conn.id)
ok('connection json carries NO secret', !!got && !JSON.stringify(got).includes(plain))
const stored = await store.connections.secret(conn.id)
ok('secret ciphertext at rest', !!stored && stored !== plain && !stored.includes(plain))
ok('secret decrypts to original', !!stored && decryptSecret(stored) === plain)

// --- self-serve provisioning: Merge (Phase B) ----------------------------
const mergeId = 'org_merge_' + uid().slice(0, 8)
const m = await provisionMergeFromPublicToken({ employerId: mergeId, employerName: 'Self-Serve Merge Health', publicToken: 'pub_demo_' + uid().slice(0, 6) })
ok('merge: employer auto-provisioned + active', (await store.employers.get(mergeId))?.integrationStatus === 'active')
ok('merge: reqs pulled on connect', m.imported > 0, `${m.imported} reqs`)
const mSec = await store.connections.secret(m.connection.id)
ok('merge: account token encrypted at rest + decrypts', !!mSec && !mSec.includes('mock-acct') && decryptSecret(mSec).startsWith('mock-acct'))

// --- self-serve provisioning: Greenhouse (Phase C backend) ---------------
const ghId = 'org_gh_' + uid().slice(0, 8)
const g = await provisionGreenhouse({ employerId: ghId, employerName: 'Self-Serve GH Clinic', apiKey: 'gh_ingest_' + uid().slice(0, 6) })
ok('greenhouse: reqs pulled on connect', g.imported > 0, `${g.imported} reqs`)
const gSec = await store.connections.secret(g.connection.id)
ok('greenhouse: API key encrypted at rest', !!gSec && !gSec.includes('gh_ingest'))

// --- inbound webhook (Phase D) -------------------------------------------
const app: ATSApplication = { id: uid(), packetId: uid(), candidateId: uid(), jobRequisitionId: uid(), employerId: mergeId, atsProvider: 'merge', submissionMode: 'native_api', atsApplicationId: 'EXT-APP-' + uid().slice(0, 6), atsStage: 'Submitted', status: 'submitted', createdAt: now() }
await store.atsApplications.insert(app)
const wI = await applyWebhookStatus('merge', app.atsApplicationId!, 'interview')
ok('webhook: interview applied', wI.applied === true)
ok('webhook: app advanced to interview', (await store.atsApplications.get(app.id))?.status === 'interview')
const wS = await applyWebhookStatus('merge', app.atsApplicationId!, 'started')
ok('webhook: started SKIPPED (start needs HRIS/attestation)', wS.applied === false && !!wS.reason)
ok('webhook: app NOT moved to started by ATS webhook', (await store.atsApplications.get(app.id))?.status === 'interview')

console.log(process.exitCode ? '\nVERIFY FAILED' : `\nPHASE A/B/C/D connect lanes OK ✓ (backend: ${backend})`)
