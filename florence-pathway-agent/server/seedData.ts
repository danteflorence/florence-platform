// Demo seed: three candidates engineered to exercise the agents end-to-end —
// a critical Pearson name mismatch + expiring ATT, a prior-refusal compliance
// block + employment gap, and a clean endorsement path.
import { store, uid, now } from './db'
import type { CandidateProfile, WorkflowType } from '../shared/types'
import { instantiateWorkflow, applyStatus } from './agents/workflow'
import { runPipeline } from './agents'
import { approveI901Receipt, attestI901Order, createI901Order, createSevismateHandoff, recordI901Receipt } from './consularPayments'

interface Seed {
  profile: Omit<CandidateProfile, 'id' | 'aliases' | 'createdAt' | 'updatedAt'>
  identity: any[]
  education: any[]
  employment: any[]
  licenses: any[]
  visaHistory: any[]
  travelHistory: any[]
  schoolPrograms: any[]
  employerOffers: any[]
  financing: any[]
  englishExams: any[]
  nclex: any[]
  workflows: WorkflowType[]
}

const SEEDS: Seed[] = [
  {
    profile: {
      legalFirstName: 'María', legalMiddleName: 'José', legalLastName: 'García Santos',
      dateOfBirth: '1996-03-12', gender: 'Female', citizenship: 'Philippines', nationality: 'Filipino',
      countryOfResidence: 'Philippines', email: 'maria.garcia@example.com', phone: '+63 917 555 0101',
      visaTarget: 'F-1', nclexState: 'Florida', employmentState: 'Florida', targetStartDate: '2026-09-01',
      arrivalStatus: 'abroad', hasSsn: false,
      // Capital sharing ON (financing packet assembles) but employer sharing OFF
      // (employer packet stays gated) — demonstrates consent-gated reuse both ways.
      consents: {
        visa: { granted: true, grantedAt: '2026-05-01', via: 'candidate_portal' },
        education: { granted: true, grantedAt: '2026-05-01', via: 'candidate_portal' },
        underwriting: { granted: true, grantedAt: '2026-05-15', via: 'candidate_portal' },
      },
    },
    identity: [{ kind: 'passport', documentNumber: 'P1234567A', nameOnDocument: 'MARIA JOSE GARCIA SANTOS', dateOfBirth: '1996-03-12', issuingAuthority: 'Philippines', issueDate: '2018-04-01', expirationDate: '2026-10-20', mrz: 'P<PHLGARCIA<SANTOS<<MARIA<JOSE', status: 'document_extracted', confidence: 'high' }],
    education: [{ school: 'University of Santo Tomas', degree: 'BSN', country: 'Philippines', graduationDate: '2018-05-20', nameOnRecord: 'Maria Jose Garcia Santos' }],
    employment: [{ employer: "St. Luke's Medical Center", role: 'Staff Nurse', specialty: 'Med-Surg', startDate: '2018-09-01', country: 'Philippines' }],
    licenses: [{ kind: 'home_country', jurisdiction: 'Philippines', licenseNumber: '0654321', status: 'active', disciplinaryAction: false, nameOnLicense: 'Maria Jose Garcia Santos' }],
    visaHistory: [{ visaType: 'F-1', priorRefusal: false, priorOverstay: false, priorUsTravel: false }],
    travelHistory: [],
    schoolPrograms: [{ schoolName: 'Galen College of Nursing', programName: 'BSN pathway', sevisSchoolCode: 'MIA214F11111000', i20Number: 'N0012345678', startDate: '2026-09-01', nameOnI20: 'Maria Jose Garcia Santos' }],
    employerOffers: [{ employer: 'Tenet Health — Florida', state: 'Florida', role: 'Registered Nurse', contingent: true }],
    financing: [{ loanApplied: true, borrowerConsent: true }],
    englishExams: [{ exam: 'IELTS', overall: 7.5, date: '2025-11-10', passed: true, nameOnReport: 'Maria Jose Garcia Santos' }],
    nclex: [{ nrb: 'Florida', programCode: 'FL-1234', pearsonRegistered: true, nameOnPearson: 'Maria Garcia', attIssued: true, attExpiresOn: '2026-06-22', priorAttempts: 0, email: 'maria.garcia@example.com' }],
    workflows: ['cgfns_ces', 'university_admission', 'sevis_i20', 'financing_packet', 'ds160', 'visa_appointment', 'nclex_att', 'florida_rn_exam', 'employer_packet'],
  },
  {
    profile: {
      legalFirstName: 'Chukwuemeka', legalLastName: 'Okafor',
      dateOfBirth: '1994-07-08', gender: 'Male', citizenship: 'Nigeria', nationality: 'Nigerian',
      countryOfResidence: 'Nigeria', email: 'c.okafor@example.com', phone: '+234 803 555 0102',
      visaTarget: 'F-1', nclexState: 'New York', employmentState: 'New York', targetStartDate: '2026-10-01',
      arrivalStatus: 'abroad', hasSsn: false,
    },
    identity: [{ kind: 'passport', documentNumber: 'A09876543', nameOnDocument: 'OKAFOR CHUKWUEMEKA', dateOfBirth: '1994-07-08', issuingAuthority: 'Nigeria', issueDate: '2021-02-01', expirationDate: '2029-01-10', status: 'document_extracted', confidence: 'high' }],
    education: [{ school: 'University of Nigeria, Nsukka', degree: 'BNSc', country: 'Nigeria', graduationDate: '2017-07-15', nameOnRecord: 'Chukwuemeka Okafor' }],
    employment: [{ employer: 'University of Nigeria Teaching Hospital', role: 'Staff Nurse', specialty: 'ICU', startDate: '2017-10-01', endDate: '2024-12-31', country: 'Nigeria' }],
    licenses: [{ kind: 'home_country', jurisdiction: 'Nigeria (NMCN)', licenseNumber: 'RN-NG-44215', status: 'active', disciplinaryAction: false, nameOnLicense: 'Chukwuemeka Okafor' }],
    visaHistory: [{ visaType: 'F-1', priorRefusal: true, refusalDetail: '2021 F-1 refusal under INA 214(b)', priorOverstay: false, priorUsTravel: false }],
    travelHistory: [],
    schoolPrograms: [{ schoolName: 'Adelphi University', programName: 'BSN', sevisSchoolCode: 'NYC214F22222000', i20Number: 'N0099887766', startDate: '2026-10-01', nameOnI20: 'Chukwuemeka Okafor' }],
    employerOffers: [{ employer: 'Tenet Health — New York', state: 'New York', role: 'Registered Nurse', contingent: true }],
    financing: [{ loanApplied: true, borrowerConsent: true }],
    englishExams: [],
    nclex: [{ nrb: 'New York', pearsonRegistered: false, attIssued: false, priorAttempts: 0, email: 'c.okafor@example.com' }],
    workflows: ['cgfns_ces', 'sevis_i20', 'ds160', 'visa_appointment', 'newyork_rn_exam'],
  },
  {
    profile: {
      legalFirstName: 'Aleksandra', legalLastName: 'Nowak',
      dateOfBirth: '1990-11-02', gender: 'Female', citizenship: 'Poland', nationality: 'Polish',
      countryOfResidence: 'United States', email: 'a.nowak@example.com', phone: '+1 212 555 0103',
      visaTarget: 'Permanent Resident', nclexState: 'New Jersey', employmentState: 'Texas', targetStartDate: '2026-08-15',
      arrivalStatus: 'arrived', hasSsn: true,
    },
    identity: [{ kind: 'passport', documentNumber: 'EB1122334', nameOnDocument: 'NOWAK ALEKSANDRA', dateOfBirth: '1990-11-02', issuingAuthority: 'Poland', issueDate: '2022-06-01', expirationDate: '2031-05-01', status: 'document_extracted', confidence: 'high' }],
    education: [{ school: 'Medical University of Warsaw', degree: 'BSN', country: 'Poland', graduationDate: '2013-06-20', nameOnRecord: 'Aleksandra Nowak' }],
    employment: [
      { employer: 'Warsaw Central Hospital', role: 'Registered Nurse', specialty: 'ED', startDate: '2013-09-01', endDate: '2018-12-31', country: 'Poland' },
      { employer: 'NewYork-Presbyterian', role: 'Registered Nurse', specialty: 'ED', startDate: '2019-03-01', country: 'United States' },
    ],
    licenses: [
      { kind: 'us_state', jurisdiction: 'New Jersey', licenseNumber: '26NR12345', status: 'active', disciplinaryAction: false, nameOnLicense: 'Aleksandra Nowak' },
      { kind: 'home_country', jurisdiction: 'Poland', licenseNumber: 'PL-RN-7781', status: 'active', disciplinaryAction: false, nameOnLicense: 'Aleksandra Nowak' },
    ],
    visaHistory: [{ visaType: 'H-1B', priorRefusal: false, priorOverstay: false, priorUsTravel: true }],
    travelHistory: [{ country: 'United States', fromDate: '2019-02-20', purpose: 'Work' }],
    schoolPrograms: [],
    employerOffers: [{ employer: 'Tenet Health — Texas', state: 'Texas', role: 'Registered Nurse', contingent: true }],
    financing: [{ loanApplied: false, borrowerConsent: true }],
    englishExams: [{ exam: 'OET', overall: 450, date: '2024-09-01', passed: true, nameOnReport: 'Aleksandra Nowak' }],
    nclex: [],
    workflows: ['endorsement'],
  },
  {
    profile: {
      legalFirstName: 'Priya', legalLastName: 'Nair',
      dateOfBirth: '1997-02-18', gender: 'Female', citizenship: 'India', nationality: 'Indian',
      countryOfResidence: 'India', email: 'priya.nair@example.com', phone: '+91 98 5550 0104',
      visaTarget: 'F-1', nclexState: 'California', employmentState: 'California', targetStartDate: '2026-10-15',
      arrivalStatus: 'abroad', hasSsn: false,
    },
    identity: [{ kind: 'passport', documentNumber: 'Z7654321', nameOnDocument: 'NAIR PRIYA', dateOfBirth: '1997-02-18', issuingAuthority: 'India', issueDate: '2020-03-01', expirationDate: '2030-02-28', status: 'document_extracted', confidence: 'high' }],
    education: [{ school: 'Government College of Nursing, Kerala', degree: 'BSc Nursing', country: 'India', graduationDate: '2019-06-30', nameOnRecord: 'Priya Nair' }],
    employment: [{ employer: 'Aster Medcity, Kochi', role: 'Staff Nurse', specialty: 'Med-Surg', startDate: '2019-09-01', country: 'India' }],
    licenses: [{ kind: 'home_country', jurisdiction: 'India (Kerala Nurses Council)', licenseNumber: 'KL-RN-55821', status: 'active', disciplinaryAction: false, nameOnLicense: 'Priya Nair' }],
    visaHistory: [{ visaType: 'F-1', priorRefusal: false, priorOverstay: false, priorUsTravel: false }],
    travelHistory: [],
    schoolPrograms: [{ schoolName: 'West Coast University', programName: 'BSN', sevisSchoolCode: 'LOS214F33333000', i20Number: 'N0055443322', startDate: '2026-10-15', nameOnI20: 'Priya Nair' }],
    employerOffers: [{ employer: 'Tenet Health — California', state: 'California', role: 'Registered Nurse', contingent: true }],
    financing: [{ loanApplied: true, borrowerConsent: true }],
    englishExams: [{ exam: 'OET', overall: 380, date: '2025-12-05', passed: true, nameOnReport: 'Priya Nair' }],
    nclex: [{ nrb: 'California', pearsonRegistered: false, attIssued: false, priorAttempts: 0, nameOnPearson: 'Priya Nair', email: 'priya.nair@example.com' }],
    workflows: ['cgfns_ces', 'sevis_i20', 'ds160', 'visa_appointment', 'california_rn_exam'],
  },
  {
    // Demo of the route recommender's signature insight: studies in NY (no SSN
    // barrier), job is in Arizona → recommended route is NY exam → AZ endorsement.
    profile: {
      legalFirstName: 'Grace', legalLastName: 'Wanjiru',
      dateOfBirth: '1995-08-22', gender: 'Female', citizenship: 'Kenya', nationality: 'Kenyan',
      countryOfResidence: 'Kenya', email: 'grace.wanjiru@example.com', phone: '+254 712 555 0105',
      visaTarget: 'F-1', nclexState: 'New York', employmentState: 'Arizona', studyState: 'New York', targetStartDate: '2027-01-15',
      arrivalStatus: 'abroad', hasSsn: false,
    },
    identity: [{ kind: 'passport', documentNumber: 'K4455667', nameOnDocument: 'WANJIRU GRACE', dateOfBirth: '1995-08-22', issuingAuthority: 'Kenya', issueDate: '2021-02-01', expirationDate: '2031-01-31', status: 'document_extracted', confidence: 'high' }],
    education: [{ school: 'University of Nairobi, School of Nursing', degree: 'BScN', country: 'Kenya', graduationDate: '2018-12-10', nameOnRecord: 'Grace Wanjiru' }],
    employment: [{ employer: 'Kenyatta National Hospital', role: 'Registered Nurse', specialty: 'ICU', startDate: '2019-03-01', country: 'Kenya' }],
    licenses: [{ kind: 'home_country', jurisdiction: 'Nursing Council of Kenya', licenseNumber: 'NCK-44221', status: 'active', disciplinaryAction: false, nameOnLicense: 'Grace Wanjiru' }],
    visaHistory: [{ visaType: 'F-1', priorRefusal: false, priorOverstay: false, priorUsTravel: false }],
    travelHistory: [],
    schoolPrograms: [{ schoolName: 'Mercy College of New York', programName: 'BSN pathway', sevisSchoolCode: 'NYC214F44444000', i20Number: 'N0099887766', startDate: '2026-09-01', nameOnI20: 'Grace Wanjiru' }],
    employerOffers: [{ employer: 'Banner Health — Arizona', state: 'Arizona', role: 'Registered Nurse', contingent: true }],
    financing: [],
    englishExams: [{ exam: 'IELTS', overall: 7.0, date: '2025-10-01', passed: true, nameOnReport: 'Grace Wanjiru' }],
    nclex: [{ nrb: 'New York', pearsonRegistered: false, attIssued: false, priorAttempts: 0, nameOnPearson: 'Grace Wanjiru', email: 'grace.wanjiru@example.com' }],
    workflows: ['cgfns_ces', 'university_admission', 'sevis_i20', 'ds160', 'visa_appointment', 'nclex_att'],
  },
]

export async function seedIfEmpty(): Promise<void> {
  if (store.candidates.count() > 0) return
  for (const s of SEEDS) {
    const id = uid()
    const profile: CandidateProfile = {
      id, aliases: [], createdAt: now(), updatedAt: now(),
      // Core pathway consent granted; Capital + employer sharing left OFF to show the gate.
      consents: {
        visa: { granted: true, grantedAt: now(), via: 'candidate_portal' },
        education: { granted: true, grantedAt: now(), via: 'candidate_portal' },
      },
      ...s.profile,
    }
    store.candidates.insert(profile)
    const link = <T extends object>(o: T) => ({ id: uid(), candidateId: id, ...o })
    s.identity.forEach((o) => store.identityDocuments.insert(link(o) as any))
    s.education.forEach((o) => store.education.insert(link(o) as any))
    s.employment.forEach((o) => store.employment.insert(link(o) as any))
    s.licenses.forEach((o) => store.licenses.insert(link(o) as any))
    s.visaHistory.forEach((o) => store.visaHistory.insert(link(o) as any))
    s.travelHistory.forEach((o) => store.travelHistory.insert(link(o) as any))
    s.schoolPrograms.forEach((o) => store.schoolPrograms.insert(link(o) as any))
    s.employerOffers.forEach((o) => store.employerOffers.insert(link(o) as any))
    s.financing.forEach((o) => store.financing.insert(link(o) as any))
    s.englishExams.forEach((o) => store.englishExams.insert(link(o) as any))
    s.nclex.forEach((o) => store.nclex.insert(link(o) as any))
    s.schoolPrograms.forEach((o) => store.documents.insert({
      id: uid(), candidateId: id, kind: 'i20', filename: `${o.schoolName} I-20.pdf`,
      uploadedAt: now(), extracted: true, extractionConfidence: 'high',
      fields: { sevisId: o.i20Number, schoolCode: o.sevisSchoolCode, programStartDate: o.startDate, nameOnI20: o.nameOnI20 },
    }))

    for (const type of s.workflows) {
      const w = instantiateWorkflow(type, id)
      store.workflows.insert(w)
      await runPipeline(w.id)
    }

    const sevis = store.workflows.byCandidate(id).find((w) => w.type === 'sevis_i20')
    if (sevis && s.schoolPrograms.length > 0) {
      applyStatus(sevis, 'qa_approved'); store.workflows.update(sevis)
      const order = createI901Order({
        candidateId: id,
        visaType: 'F1',
        payerType: s.profile.legalFirstName === 'Chukwuemeka' ? 'florence' : 'student',
        officialFeeUsd: 350,
        serviceFeeUsd: s.profile.legalFirstName === 'Grace' ? 40 : 30,
        taxOrProcessingFeeUsd: 0,
        localCurrency: s.profile.countryOfResidence === 'Philippines' ? 'PHP' : s.profile.countryOfResidence === 'India' ? 'INR' : undefined,
        localAmount: s.profile.countryOfResidence === 'Philippines' ? 21600 : s.profile.countryOfResidence === 'India' ? 33600 : undefined,
        serviceSpeed: s.profile.legalFirstName === 'Grace' ? 'standard' : 'basic',
        dueDate: '2026-07-15',
        ownerUserId: 'navigator',
      })
      if (s.profile.legalFirstName === 'Priya') {
        attestI901Order(order.id, 'Priya Nair')
        createSevismateHandoff(order.id)
      }
      if (s.profile.legalFirstName === 'Grace') {
        attestI901Order(order.id, 'Grace Wanjiru')
        createSevismateHandoff(order.id)
        recordI901Receipt(order.id, {
          filename: 'grace-i901-receipt.pdf',
          sevisId: s.schoolPrograms[0].i20Number,
          legalName: s.schoolPrograms[0].nameOnI20,
          schoolCode: s.schoolPrograms[0].sevisSchoolCode,
          formType: 'I-20',
          visaType: 'F1',
          receiptDate: '2026-06-20',
          amountUsd: 350,
          source: 'student_upload',
          extractionConfidence: 'high',
        })
        approveI901Receipt(order.id, 'Seed QA')
      }
    }
  }

  // Demo: a board deficiency on the New York application — shows the guided response flow.
  const ny = store.workflows.all().find((w) => w.type === 'newyork_rn_exam')
  if (ny) {
    store.deficiencies.insert({
      id: uid(), workflowId: ny.id, candidateId: ny.candidateId,
      source: 'NYSED Office of the Professions',
      classification: 'Required coursework',
      items: [
        'NYSED-approved infection-control coursework certificate not received',
        'NYSED-approved child-abuse identification coursework certificate not received',
      ],
      responseDraft: 'Classification: Required coursework.\n\n1. Complete an NYSED-approved infection-control course; have the provider submit the certificate to NYSED.\n2. Complete an NYSED-approved child-abuse identification course; submit the certificate.\n\nEach item is added to the candidate checklist with provider links. Human QA reviews the response before it is sent.',
      receivedAt: now(),
    })
    const w = store.workflows.get(ny.id)!
    applyStatus(w, 'deficiency_received'); store.workflows.update(w)
  }

  console.log(`[pathway] seeded ${SEEDS.length} demo candidates`)
}
