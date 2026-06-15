// ============================================================================
// Store — the async data-access contract the whole app depends on. Two backends
// implement it: node:sqlite (default) and Postgres (env ATS_DB=postgres, via
// embedded PGlite or a networked server with DATABASE_URL). Nothing above this
// interface knows which backend is live.
//
// It is ASYNC because Postgres clients are async (node:sqlite is sync, so its
// backend just wraps the synchronous calls). This is the seam the original
// db.ts comment promised: "swap this one file for Postgres; nothing above changes."
// ============================================================================
import type {
  EmployerAccount, Facility, JobRequisition, FlorenceCandidate, EmployerShareConsent,
  ApplicationPacket, ATSApplication, ProductionLedgerEvent, SyncEvent, AuditEntry, AtsConnection,
  Program, ProgramWave, ProgramSlate,
} from '../../shared/types'
import type {
  DemandSource, RawJobPosting, FlorenceRNJob, JobSource, JobEconomics,
  TrackingLink, TrackingClick, CandidateJobInterest, AttributionEvent, ReconciliationEvent,
  DemandReservation, JobBenefits,
  HiringSignal, ClaimedEmployerJob, NurseMarketInterest, ClaimToken,
} from '../../shared/demand-types'

export interface Store {
  employers: {
    insert(e: EmployerAccount): Promise<void>
    update(e: EmployerAccount): Promise<void>
    get(id: string): Promise<EmployerAccount | null>
    all(): Promise<EmployerAccount[]>
  }
  facilities: {
    insert(f: Facility): Promise<void>
    get(id: string): Promise<Facility | null>
    byEmployer(eid: string): Promise<Facility[]>
    all(): Promise<Facility[]>
  }
  requisitions: {
    insert(r: JobRequisition): Promise<void>
    update(r: JobRequisition): Promise<void>
    get(id: string): Promise<JobRequisition | null>
    byEmployer(eid: string): Promise<JobRequisition[]>
    open(): Promise<JobRequisition[]>
    all(): Promise<JobRequisition[]>
  }
  candidates: {
    insert(c: FlorenceCandidate): Promise<void>
    update(c: FlorenceCandidate): Promise<void>
    get(id: string): Promise<FlorenceCandidate | null>
    all(): Promise<FlorenceCandidate[]>
  }
  consents: {
    insert(c: EmployerShareConsent): Promise<void>
    update(c: EmployerShareConsent): Promise<void>
    get(id: string): Promise<EmployerShareConsent | null>
    live(candidateId: string, employerId: string): Promise<EmployerShareConsent | null>
    byCandidate(cid: string): Promise<EmployerShareConsent[]>
  }
  packets: {
    insert(p: ApplicationPacket): Promise<void>
    update(p: ApplicationPacket): Promise<void>
    get(id: string): Promise<ApplicationPacket | null>
    byCandidate(cid: string): Promise<ApplicationPacket[]>
    all(): Promise<ApplicationPacket[]>
  }
  atsApplications: {
    insert(a: ATSApplication): Promise<void>
    update(a: ATSApplication): Promise<void>
    get(id: string): Promise<ATSApplication | null>
    byEmployer(eid: string): Promise<ATSApplication[]>
    all(): Promise<ATSApplication[]>
  }
  ledger: {
    insert(e: ProductionLedgerEvent): Promise<void>
    byCandidate(cid: string): Promise<ProductionLedgerEvent[]>
    byEmployer(eid: string): Promise<ProductionLedgerEvent[]>
    all(): Promise<ProductionLedgerEvent[]>
  }
  sync: {
    insert(s: SyncEvent): Promise<void>
    recent(limit?: number): Promise<SyncEvent[]>
    failed(): Promise<SyncEvent[]>
    all(): Promise<SyncEvent[]>
  }
  audit: {
    log(e: AuditEntry): Promise<void>
    recent(limit?: number): Promise<AuditEntry[]>
  }
  /** Durable idempotency cache for /v1 create routes — replaces the in-memory Map
   *  so a retried create is replay-safe across restarts/instances. Caller-scoped key;
   *  only successful (2xx) responses are stored + replayed. */
  idempotency: {
    get(key: string): Promise<{ status: number; body: unknown } | null>
    put(key: string, status: number, body: unknown): Promise<void>
  }
  /** Self-serve ATS connections. The credential is passed/stored as an opaque
   *  encrypted blob (see server/vault.ts) — never in the connection's json. */
  connections: {
    insert(c: AtsConnection, encryptedSecret: string): Promise<void>
    update(c: AtsConnection): Promise<void>
    get(id: string): Promise<AtsConnection | null>
    /** Returns the ENCRYPTED secret blob; the caller decrypts via the vault. */
    secret(id: string): Promise<string | null>
    byEmployer(eid: string): Promise<AtsConnection[]>
    all(): Promise<AtsConnection[]>
  }

  // ── Demand Radar ──────────────────────────────────────────────────────────
  demandSources: {
    insert(s: DemandSource): Promise<void>
    update(s: DemandSource): Promise<void>
    get(id: string): Promise<DemandSource | null>
    all(): Promise<DemandSource[]>
  }
  rawJobs: {
    insert(j: RawJobPosting): Promise<void>
    update(j: RawJobPosting): Promise<void>
    byContentHash(hash: string): Promise<RawJobPosting | null>
    bySource(sourceId: string): Promise<RawJobPosting[]>
    all(): Promise<RawJobPosting[]>
  }
  demandJobs: {
    insert(j: FlorenceRNJob): Promise<void>
    update(j: FlorenceRNJob): Promise<void>
    get(id: string): Promise<FlorenceRNJob | null>
    byFingerprint(fp: string): Promise<FlorenceRNJob | null>
    open(): Promise<FlorenceRNJob[]>
    all(): Promise<FlorenceRNJob[]>
  }
  jobSources: {
    insert(s: JobSource): Promise<void>
    byJob(jobId: string): Promise<JobSource[]>
  }
  jobEconomics: {
    insert(e: JobEconomics): Promise<void>
    latestByJob(jobId: string): Promise<JobEconomics | null>
    all(): Promise<JobEconomics[]>
  }
  jobBenefits: {
    insert(b: JobBenefits): Promise<void>
    byJob(jobId: string): Promise<JobBenefits[]>
    all(): Promise<JobBenefits[]>
  }
  trackingLinks: {
    insert(l: TrackingLink): Promise<void>
    get(id: string): Promise<TrackingLink | null>
    byShortCode(code: string): Promise<TrackingLink | null>
    byJob(jobId: string): Promise<TrackingLink[]>
    all(): Promise<TrackingLink[]>
  }
  trackingClicks: {
    insert(c: TrackingClick): Promise<void>
    byLink(linkId: string): Promise<TrackingClick[]>
    recent(limit?: number): Promise<TrackingClick[]>
    all(): Promise<TrackingClick[]>
  }
  jobInterests: {
    insert(i: CandidateJobInterest): Promise<void>
    update(i: CandidateJobInterest): Promise<void>
    byCandidate(cid: string): Promise<CandidateJobInterest[]>
    byJob(jobId: string): Promise<CandidateJobInterest[]>
    all(): Promise<CandidateJobInterest[]>
  }
  attribution: {
    insert(e: AttributionEvent): Promise<void>
    byClick(frnClickId: string): Promise<AttributionEvent[]>
    byCandidate(cid: string): Promise<AttributionEvent[]>
    all(): Promise<AttributionEvent[]>
  }
  reconciliations: {
    insert(e: ReconciliationEvent): Promise<void>
    all(): Promise<ReconciliationEvent[]>
  }
  reservations: {
    insert(r: DemandReservation): Promise<void>
    update(r: DemandReservation): Promise<void>
    get(id: string): Promise<DemandReservation | null>
    byJob(jobId: string): Promise<DemandReservation[]>
    byEmployer(eid: string): Promise<DemandReservation[]>
    live(): Promise<DemandReservation[]>
    all(): Promise<DemandReservation[]>
  }

  // AMN/Kaiser Program Workspace
  programs: {
    insert(p: Program): Promise<void>
    update(p: Program): Promise<void>
    get(id: string): Promise<Program | null>
    byEmployer(employerId: string): Promise<Program[]>
    all(): Promise<Program[]>
  }
  programWaves: {
    insert(w: ProgramWave): Promise<void>
    update(w: ProgramWave): Promise<void>
    get(id: string): Promise<ProgramWave | null>
    byProgram(programId: string): Promise<ProgramWave[]>
  }
  programSlates: {
    insert(s: ProgramSlate): Promise<void>
    update(s: ProgramSlate): Promise<void>
    get(id: string): Promise<ProgramSlate | null>
    byProgram(programId: string): Promise<ProgramSlate[]>
    all(): Promise<ProgramSlate[]>
  }

  // Long-Tail Demand Radar
  hiringSignals: {
    insert(s: HiringSignal): Promise<void>
    update(s: HiringSignal): Promise<void>
    get(id: string): Promise<HiringSignal | null>
    byMarket(market: string, roleCategory?: string): Promise<HiringSignal[]>
    unclaimed(): Promise<HiringSignal[]>
    all(): Promise<HiringSignal[]>
  }
  claimedJobs: {
    insert(j: ClaimedEmployerJob): Promise<void>
    update(j: ClaimedEmployerJob): Promise<void>
    get(id: string): Promise<ClaimedEmployerJob | null>
    byEmployer(employerId: string): Promise<ClaimedEmployerJob[]>
    bySignal(signalId: string): Promise<ClaimedEmployerJob[]>
    all(): Promise<ClaimedEmployerJob[]>
  }
  marketInterest: {
    insert(i: NurseMarketInterest): Promise<void>
    update(i: NurseMarketInterest): Promise<void>
    byMarket(market: string, roleCategory?: string): Promise<NurseMarketInterest[]>
    byCandidate(cid: string): Promise<NurseMarketInterest[]>
    all(): Promise<NurseMarketInterest[]>
  }
  claimTokens: {
    insert(t: ClaimToken): Promise<void>
    update(t: ClaimToken): Promise<void>
    byToken(token: string): Promise<ClaimToken | null>
    get(id: string): Promise<ClaimToken | null>
    all(): Promise<ClaimToken[]>
  }

  counts(): Promise<Record<string, number>>
}
