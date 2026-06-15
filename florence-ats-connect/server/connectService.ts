// ============================================================================
// Connect service — the "click → pipeline live" provisioning shared by every
// self-serve lane (Merge embedded, Greenhouse key, future native OAuth). Given an
// authorized credential, it: ensures the EmployerAccount, stores the credential
// ENCRYPTED on a new AtsConnection, and pulls the employer's open reqs in.
//
// Provider-generic so routes stay thin and it's testable without HTTP/Core.
// ============================================================================
import { store, uid, now } from './db'
import { encryptSecret } from './vault'
import { getConnector } from './connectors'
import { exchangeMergePublicToken } from './connectors/merge'
import type { AtsConnection, ATSProvider, EmployerAccount, JobRequisition } from '../shared/types'

/** Create the EmployerAccount if missing (id == the Core org_id for employer-role
 *  users), else mark it active on this provider. */
async function ensureEmployer(employerId: string, name: string, provider: ATSProvider): Promise<EmployerAccount> {
  const existing = await store.employers.get(employerId)
  if (existing) {
    existing.atsProvider = provider
    existing.integrationStatus = 'active'
    existing.updatedAt = now()
    await store.employers.update(existing)
    return existing
  }
  const e: EmployerAccount = {
    id: employerId, name, atsProvider: provider, integrationStatus: 'active',
    defaultBillingModel: 'direct', sourceChannel: 'direct', createdAt: now(), updatedAt: now(),
  }
  await store.employers.insert(e)
  return e
}

/** Pull open reqs from the provider's connector into the canonical model. */
async function pullInto(employer: EmployerAccount, provider: ATSProvider): Promise<number> {
  const connector = getConnector(provider)
  if (!connector) return 0
  const jobs = await connector.listJobs(employer)
  const existing = await store.requisitions.byEmployer(employer.id)
  let imported = 0
  for (const j of jobs) {
    if (j.atsRequisitionId && existing.some((r) => r.atsRequisitionId === j.atsRequisitionId)) continue
    const r: JobRequisition = {
      id: uid(), employerId: employer.id, atsProvider: provider,
      atsRequisitionId: j.atsRequisitionId, atsJobUrl: j.atsJobUrl, title: j.title ?? 'Registered Nurse',
      specialty: j.specialty, setting: j.setting ?? 'inpatient', city: j.city, state: j.state,
      requiredLicenseState: j.requiredLicenseState ?? j.state, shift: j.shift, employmentType: j.employmentType,
      openings: j.openings, targetStartWindow: j.targetStartWindow, status: 'open',
      sourceChannel: employer.sourceChannel, importedAt: now(), lastSyncedAt: now(),
    }
    await store.requisitions.insert(r)
    await store.sync.insert({ id: uid(), employerId: employer.id, atsProvider: provider, entityType: 'job_requisition', entityId: r.id, direction: 'inbound', status: 'success', createdAt: now() })
    imported++
  }
  return imported
}

export interface ProvisionResult { connection: AtsConnection; employer: EmployerAccount; imported: number }

/** Core provisioning: ensure employer → store encrypted credential → pull reqs. */
export async function provisionConnection(args: { employerId: string; employerName: string; provider: ATSProvider; secret: string; externalAccountId?: string }): Promise<ProvisionResult> {
  const employer = await ensureEmployer(args.employerId, args.employerName, args.provider)
  const connection: AtsConnection = {
    id: uid(), employerId: employer.id, provider: args.provider,
    externalAccountId: args.externalAccountId, status: 'active', createdAt: now(), lastSyncAt: now(),
  }
  await store.connections.insert(connection, encryptSecret(args.secret))
  await store.sync.insert({ id: uid(), employerId: employer.id, atsProvider: args.provider, entityType: 'connection', entityId: connection.id, direction: 'inbound', status: 'success', createdAt: now() })
  const imported = await pullInto(employer, args.provider)
  return { connection, employer, imported }
}

/** Merge Link callback → durable account token → provision. */
export async function provisionMergeFromPublicToken(args: { employerId: string; employerName: string; publicToken: string }): Promise<ProvisionResult> {
  const ex = await exchangeMergePublicToken(args.publicToken)
  return provisionConnection({ employerId: args.employerId, employerName: args.employerName, provider: 'merge', secret: ex.accountToken, externalAccountId: ex.accountId })
}

/** Greenhouse self-serve: the customer-created Candidate Ingestion API key. */
export async function provisionGreenhouse(args: { employerId: string; employerName: string; apiKey: string }): Promise<ProvisionResult> {
  return provisionConnection({ employerId: args.employerId, employerName: args.employerName, provider: 'greenhouse', secret: args.apiKey })
}
